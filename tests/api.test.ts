import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { MongoMemoryServer } from "../server/node_modules/mongodb-memory-server-core/lib/index.js";
import { options, lineup, simulate, defaultConfig } from "../shared/game.ts";
test(
  "daily API validates drafts, recomputes scores, rejects duplicates and restricts CORS",
  { timeout: 180000 },
  async () => {
    const mongo = await MongoMemoryServer.create({
      instance: { args: ["--nounixsocket"] },
    });
    const child = spawn(process.execPath, ["dist/server/src/index.js"], {
      cwd: new URL("../server/", import.meta.url),
      env: {
        ...process.env,
        PORT: "4123",
        MONGODB_URI: mongo.getUri(),
        SEED_SECRET: "test-secret-not-for-production-123456",
        WEB_ORIGINS: "https://example.com",
        TRUST_PROXY: "0",
      },
      stdio: "pipe",
    });
    let output = "";
    child.stderr.on("data", (s) => (output += s));
    const base = "http://127.0.0.1:4123";
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
      const d = await (await fetch(base + "/api/daily")).json();
      assert.equal(d.date, new Date().toISOString().slice(0, 10));
      assert.equal(
        d.seed,
        (await (await fetch(base + "/api/daily")).json()).seed,
      );
      const picks: string[] = [];
      for (let i = 0; i < 11; i++)
        picks.push(options(d.seed, picks).players[0].id);
      const config = { ...defaultConfig, captain: picks[0] };
      const post = (body: unknown) =>
        fetch(base + "/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      assert.equal(
        (
          await post({
            date: d.date,
            playerName: "Tester",
            picks,
            config: { ...config, difficulty: "casual" },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await post({
            date: d.date,
            playerName: "Tester",
            picks: Array(11).fill(picks[0]),
            config,
          })
        ).status,
        400,
      );
      const response = await post({
        date: d.date,
        playerName: "Tester",
        picks,
        config,
      });
      assert.equal(response.status, 201);
      const score = await response.json();
      const expected = simulate(lineup(d.seed, picks), d.seed, config);
      assert.equal(score.matchesWon, expected.wins);
      assert.equal(score.strength, expected.strength);
      assert.equal(
        (await post({ date: d.date, playerName: "Again", picks, config }))
          .status,
        409,
      );
      const board = await (
        await fetch(base + "/api/leaderboard?date=" + d.date)
      ).json();
      assert.equal(board[0].playerName, "Tester");
      assert.equal("submitter" in board[0], false);
      const allowed = await fetch(base + "/api/daily", {
        headers: { Origin: "https://example.com" },
      });
      assert.equal(
        allowed.headers.get("access-control-allow-origin"),
        "https://example.com",
      );
      const preflight = await fetch(base + "/api/scores", {
        method: "OPTIONS",
        headers: {
          Origin: "https://example.com",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type",
        },
      });
      assert.equal(preflight.status, 204);
      const denied = await fetch(base + "/api/daily", {
        headers: { Origin: "https://other.com" },
      });
      assert.equal(denied.headers.get("access-control-allow-origin"), null);
      assert.equal(
        (await fetch(base + "/api/leaderboard?date=wrong")).status,
        400,
      );
      let limited = false;
      for (let i = 0; i < 10; i++)
        if ((await post({})).status === 429) {
          limited = true;
          break;
        }
      assert.ok(limited);
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
