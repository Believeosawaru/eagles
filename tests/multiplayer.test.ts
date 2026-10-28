import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { MongoMemoryServer } from "../server/node_modules/mongodb-memory-server-core/lib/index.js";
test(
  "two independent room clients draft and receive one authoritative match",
  { timeout: 180000 },
  async () => {
    const mongo = await MongoMemoryServer.create({
      instance: { args: ["--nounixsocket"] },
    });
    const child = spawn(process.execPath, ["dist/server/src/index.js"], {
      cwd: new URL("../server/", import.meta.url),
      env: {
        ...process.env,
        PORT: "4124",
        MONGODB_URI: mongo.getUri(),
        SEED_SECRET: "multiplayer-test-secret-not-production-123",
        WEB_ORIGINS: "http://localhost:8089",
        TRUST_PROXY: "0",
      },
      stdio: "pipe",
    });
    let output = "";
    child.stderr.on("data", (d) => (output += d));
    const base = "http://127.0.0.1:4124";
    const post = (path: string, body: unknown, token?: string) =>
      fetch(base + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: JSON.stringify(body),
      });
    const get = (code: string, token: string) =>
      fetch(base + "/api/rooms/" + code, {
        headers: { Authorization: "Bearer " + token },
      });
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(base + "/api/health")).ok) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.ok(ready, output);
      const created = await post("/api/rooms", { name: "Believe" });
      assert.equal(created.status, 201);
      const a = await created.json();
      assert.equal(a.state.phase, "waiting");
      assert.equal("seed" in a.state, false);
      assert.equal(JSON.stringify(a.state).includes("tokenHash"), false);
      const joined = await post("/api/rooms/" + a.state.code + "/join", {
        name: "Chidi",
      });
      assert.equal(joined.status, 200);
      const b = await joined.json();
      assert.notEqual(a.token, b.token);
      assert.equal(
        (await post("/api/rooms/" + a.state.code + "/join", { name: "Third" }))
          .status,
        409,
      );
      assert.equal((await get(a.state.code, "0".repeat(64))).status, 403);
      assert.equal(
        (
          await post(
            "/api/rooms/" + a.state.code + "/pick",
            { choice: "not-real", count: 0 },
            a.token,
          )
        ).status,
        409,
      );
      let sa = await (await get(a.state.code, a.token)).json(),
        sb = b.state;
      for (let n = 0; n < 11; n++) {
        const ra = await post(
          "/api/rooms/" + a.state.code + "/pick",
          { choice: sa.choices.players[0].id, count: n },
          a.token,
        );
        assert.equal(ra.status, 200);
        sa = await ra.json();
        if (n === 0) {
          assert.equal(
            (
              await post(
                "/api/rooms/" + a.state.code + "/pick",
                { choice: "p1", count: 0 },
                a.token,
              )
            ).status,
            409,
          );
          assert.equal(sa.players[1].picks, undefined);
        }
        const rb = await post(
          "/api/rooms/" + a.state.code + "/pick",
          { choice: sb.choices.players[2].id, count: n },
          b.token,
        );
        assert.equal(rb.status, 200);
        sb = await rb.json();
      }
      sa = await (await get(a.state.code, a.token)).json();
      assert.equal(sa.phase, "finished");
      assert.equal(sb.phase, "finished");
      assert.deepEqual(sa.result, sb.result);
      assert.equal(sa.players[0].picks.length, 11);
      assert.equal(sa.players[1].picks.length, 11);
      assert.equal(new Set(sa.players[0].picks).size, 11);
      assert.equal("tokenHash" in sa.players[0], false);
      assert.ok(sa.result.events.length > 40);
      assert.equal(sa.result.events.at(-1).home, sa.result.home);
      assert.equal(sa.result.events.at(-1).away, sa.result.away);
      assert.ok(sa.result.home !== sa.result.away || sa.result.penalties);
      assert.equal(
        (
          await post(
            "/api/rooms/" + sa.code + "/pick",
            { choice: "p1", count: 0 },
            a.token,
          )
        ).status,
        409,
      );
      console.log(
        "Passed: private tokens, capacity, validated picks, stale-write rejection, reconnect GET and identical results.",
      );
    } finally {
      child.kill("SIGTERM");
      await new Promise<void>((r) => {
        if (child.exitCode !== null) r();
        else child.once("exit", () => r());
      });
      await mongo.stop();
    }
  },
);
