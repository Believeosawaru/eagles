import { playerLeaders } from "../shared/worldcup.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { options, lineup, simulate, players, slots } from "../shared/game.ts";
test("64 unique rated players", () => {
  assert.equal(players.length, 64);
  assert.equal(new Set(players.map((p) => p.id)).size, 64);
  assert.ok(players.every((p) => p.rating >= 60 && p.rating <= 99));
});
test("1000 drafts always have three legal choices and eleven unique players", () => {
  for (let i = 0; i < 1000; i++) {
    const seed = "test-" + i,
      picks: string[] = [];
    for (let n = 0; n < 11; n++) {
      const a = options(seed, picks);
      assert.deepEqual(a, options(seed, picks));
      assert.equal(a.players.length, 3);
      assert.ok(
        a.players.every(
          (p) => p.position === slots[n] && !picks.includes(p.id),
        ),
      );
      picks.push(a.players[(i + n) % 3].id);
    }
    assert.equal(new Set(lineup(seed, picks).map((p) => p.id)).size, 11);
    const r = simulate(lineup(seed, picks), seed);
    assert.deepEqual(r, simulate(lineup(seed, picks), seed));
    assert.ok(r.matches.length >= 3 && r.matches.length <= 7);
    assert.ok(
      r.matches.every(
        (m) =>
          m.stage.startsWith("Group") || m.home !== m.away || !!m.penalties,
      ),
    );
    if (r.matches.length > 3 && r.matches.at(-1)?.stage !== "Final")
      assert.equal(r.matches.at(-1)?.won, false);
  }
});
test("tampered and incomplete drafts are rejected", () => {
  assert.throws(() => lineup("x", []));
  assert.throws(() => lineup("x", Array(11).fill("p1")));
});
test("visual events agree with final scores, stats and deterministic tactics", () => {
  for (let i = 0; i < 300; i++) {
    const seed = "visual-" + i,
      picks: string[] = [];
    for (let n = 0; n < 11; n++)
      picks.push(options(seed, picks).players[n % 3].id);
    const team = lineup(seed, picks);
    for (const tactic of ["balanced", "attack", "counter"] as const) {
      const config = {
        tactic,
        captain: picks[0],
        difficulty: "standard" as const,
      };
      const r = simulate(team, seed, config);
      assert.deepEqual(r, simulate(team, seed, config));
      for (const m of r.matches) {
        assert.ok(m.events.length > 40);
        assert.equal(m.events.at(-1)?.home, m.home);
        assert.equal(m.events.at(-1)?.away, m.away);
        assert.equal(
          m.events.filter((e) => e.kind === "goal" && e.side === "home").length,
          m.home,
        );
        assert.equal(
          m.events.filter((e) => e.kind === "goal" && e.side === "away").length,
          m.away,
        );
        assert.ok(m.homeShots >= m.home && m.awayShots >= m.away);
        assert.ok(
          m.events.every(
            (e) => e.x >= 0 && e.x <= 100 && e.y >= 0 && e.y <= 100,
          ),
        );
      }
    }
  }
});

test("repeat attempts vary gently with occasional bigger score changes", () => {
  const seed = "rematch-study",
    picks: string[] = [];
  for (let i = 0; i < 11; i++) picks.push(options(seed, picks).players[0].id);
  const team = lineup(seed, picks);
  let same = 0,
    small = 0,
    big = 0;
  let last = simulate(team, seed, undefined, "attempt-0").matches[0];
  for (let i = 1; i <= 3000; i++) {
    const next = simulate(team, seed, undefined, "attempt-" + i).matches[0],
      delta = Math.abs(next.home - last.home) + Math.abs(next.away - last.away);
    if (delta === 0) same++;
    if (delta <= 2) small++;
    if (delta >= 3) big++;
    last = next;
  }
  console.log({ same, small, big, total: 3000 });
  assert.ok(same > 1000);
  assert.ok(small > 2700);
  assert.ok(big > 0 && big < 300);
});
test("possession scenes connect player locations and ball targets", () => {
  const seed = "movement-test",
    picks: string[] = [];
  for (let i = 0; i < 11; i++) picks.push(options(seed, picks).players[0].id);
  const result = simulate(lineup(seed, picks), seed);
  for (const m of result.matches) {
    for (const e of m.events) {
      assert.equal(e.positions.length, 22);
      assert.ok(
        e.positions.every(
          (p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100,
        ),
      );
      if (e.owner !== null) {
        assert.equal(e.x, e.positions[e.owner].x);
        assert.equal(e.y, e.positions[e.owner].y);
      }
    }
    assert.ok(m.events.some((e) => e.kind === "carry"));
    assert.ok(m.events.some((e) => e.kind === "save" || e.kind === "miss"));
    assert.equal(m.events[0].kind, "kickoff");
    assert.equal(m.events.at(-1)?.minute, 90);
  }
});
test("World Cup groups, bracket and player awards stay consistent", () => {
  for (let n = 0; n < 30; n++) {
    const seed = "cup-" + n,
      picks: string[] = [];
    for (let i = 0; i < 11; i++) picks.push(options(seed, picks).players[0].id);
    const r = simulate(lineup(seed, picks), seed);
    const fixtures = r.tournament.fixtures;
    assert.equal(fixtures.length, 63);
    const leaders = playerLeaders(fixtures);
    assert.equal(
      leaders.scorers.reduce((n, p) => n + p.goals, 0),
      fixtures.reduce((n, f) => n + f.home + f.away, 0),
    );
    assert.equal(
      leaders.assisters.reduce((n, p) => n + p.assists, 0),
      fixtures.reduce((n, f) => n + f.goals.filter((g) => g.assist).length, 0),
    );
    assert.equal(fixtures.filter((f) => f.group !== undefined).length, 48);
    assert.equal(fixtures.filter((f) => f.stage === "Round of 16").length, 8);
    assert.equal(fixtures.filter((f) => f.stage === "Final").length, 1);
    assert.ok(fixtures.every((f) => f.homeTeam !== f.awayTeam));
    for (const f of fixtures) {
      assert.equal(f.goals.filter((g) => g.side === "home").length, f.home);
      assert.equal(f.goals.filter((g) => g.side === "away").length, f.away);
      assert.ok(f.goals.every((g) => g.scorer && g.scorer !== g.assist));
    }
    assert.equal(
      r.matches.slice(0, 3).every((m) => m.stage.startsWith("Group")),
      true,
    );
  }
});
test("late goals carry situational commentary and every Nigeria goal names an assister", () => {
  let late = 0;
  for (let n = 0; n < 30; n++) {
    const seed = "late-" + n,
      picks: string[] = [];
    for (let i = 0; i < 11; i++) picks.push(options(seed, picks).players[0].id);
    const r = simulate(lineup(seed, picks), seed);
    for (const m of r.matches)
      for (const e of m.events)
        if (e.kind === "goal") {
          assert.ok(e.scorer && e.assist && e.scorerId && e.assistId);
          if (e.minute >= 85) {
            late++;
            assert.match(
              e.text,
              /UNBELIEVABLE|DRAMA|pulls one back|beyond doubt/,
            );
          }
        }
  }
  assert.ok(late > 0);
});
