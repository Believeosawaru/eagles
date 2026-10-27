import { rng } from "./random.ts";
export { rng } from "./random.ts";
import { createWorldCup, countryByName } from "./worldcup.ts";
import raw from "./players.json" with { type: "json" };
export type Position = "GK" | "DEF" | "MID" | "FWD";
export type Player = {
  id: string;
  name: string;
  position: Position;
  era: string;
  rating: number;
};
export const players = raw as Player[];
export const slots: Position[] = [
  "GK",
  "DEF",
  "DEF",
  "DEF",
  "DEF",
  "MID",
  "MID",
  "MID",
  "FWD",
  "FWD",
  "FWD",
];
export const eras = ["1990s", "2000s", "2010s", "2020s"];
export function options(seed: string, picks: string[]) {
  if (picks.length >= 11) throw Error("Draft complete");
  const random = rng(`${seed}:draft:${picks.length}`);
  const position = slots[picks.length];
  const available = players.filter(
    (p) => p.position === position && !picks.includes(p.id),
  );
  const possible = eras.filter(
    (era) => available.filter((p) => p.era === era).length >= 3,
  );
  if (!possible.length) throw Error("Dataset cannot fill slot");
  const era = possible[Math.floor(random() * possible.length)];
  const pool = available.filter((p) => p.era === era);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { era, players: pool.slice(0, 3) };
}
export function lineup(seed: string, picks: string[]) {
  if (picks.length !== 11 || new Set(picks).size !== 11)
    throw Error("Choose eleven unique players");
  picks.forEach((id, i) => {
    if (!options(seed, picks.slice(0, i)).players.some((p) => p.id === id))
      throw Error("Invalid draft choice");
  });
  return picks.map((id) => players.find((p) => p.id === id)!);
}
export function strength(team: Player[]) {
  const weights = { GK: 1.2, DEF: 1, MID: 1.15, FWD: 1.2 };
  return (
    Math.round(
      (team.reduce((s, p) => s + p.rating * weights[p.position], 0) /
        team.reduce((s, p) => s + weights[p.position], 0)) *
        10,
    ) / 10
  );
}
export const opponents = [
  ["Group · 1", "Mexico", 72],
  ["Group · 2", "Japan", 75],
  ["Group · 3", "Portugal", 78],
  ["Round of 16", "Netherlands", 81],
  ["Quarter-final", "Argentina", 84],
  ["Semi-final", "France", 87],
  ["Final", "Brazil", 90],
] as const;

export type Tactic = "balanced" | "attack" | "counter";
export type Difficulty = "casual" | "standard" | "legend";
export type Config = {
  tactic: Tactic;
  captain: string;
  difficulty: Difficulty;
};
export const defaultConfig: Config = {
  tactic: "balanced",
  captain: "",
  difficulty: "standard",
};
export function chemistry(team: Player[]) {
  const pairs = team.slice(1).filter((p, i) => p.era === team[i].era).length;
  return Math.min(3, Math.round(pairs / 2));
}
export function effectiveStrength(team: Player[], config: Config) {
  return (
    Math.round(
      (strength(team) +
        chemistry(team) +
        (team.some((p) => p.id === config.captain) ? 1 : 0)) *
        10,
    ) / 10
  );
}

export type Point = { x: number; y: number };
export type MatchEvent = {
  minute: number;
  kind:
    | "kickoff"
    | "pass"
    | "carry"
    | "interception"
    | "shot"
    | "save"
    | "miss"
    | "goal"
    | "half"
    | "full";
  side: "home" | "away";
  text: string;
  home: number;
  away: number;
  x: number;
  y: number;
  positions: Point[];
  owner: number | null;
  flight: boolean;
  scorer?: string;
  scorerId?: string;
  assistId?: string;
  assist?: string;
};
export const formation: Point[] = [
  [7, 50],
  [23, 15],
  [20, 38],
  [20, 62],
  [23, 85],
  [44, 25],
  [40, 50],
  [44, 75],
  [67, 18],
  [72, 50],
  [67, 82],
].map(([x, y]) => ({ x, y }));
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
function poisson(lambda: number, u: number) {
  let probability = Math.exp(-lambda),
    sum = probability,
    k = 0;
  while (u > sum && k < 5) {
    k++;
    probability *= lambda / k;
    sum += probability;
  }
  return k;
}
/** Same attempt key reproduces a replay. A fresh key gives mostly small changes. */
export function simulate(
  team: Player[],
  seed: string,
  config: Config = defaultConfig,
  attempt = seed,
) {
  const rating = effectiveStrength(team, config),
    stable = rng(
      seed +
        ":v3:" +
        config.tactic +
        ":" +
        config.captain +
        ":" +
        config.difficulty,
    ),
    variation = rng(attempt + ":variation");
  function play(stage: string, opponent: string, base: number) {
    const difficulty =
      base +
      (config.difficulty === "casual"
        ? -7
        : config.difficulty === "legend"
          ? 6
          : 0);
    const tacticBonus =
      config.tactic === "attack"
        ? difficulty < rating
          ? 2
          : -1
        : config.tactic === "counter"
          ? difficulty > rating
            ? 2
            : -1
          : 0;
    const advantage = rating + tacticBonus - difficulty;
    // Common underlying team performance; occasional larger match-day shocks.
    const volatile = variation() < 0.07;
    const jitter = (u: number) =>
      clamp(u + (variation() - 0.5) * (volatile ? 0.85 : 0.14), 0.001, 0.999);
    const home = poisson(
      clamp(1.35 + advantage * 0.045, 0.4, 2.8),
      jitter(stable()),
    );
    const away = poisson(
      clamp(1.2 - advantage * 0.035, 0.35, 2.6),
      jitter(stable()),
    );
    const penalties =
      home === away && !stage.startsWith("Group")
        ? jitter(stable()) < 1 / (1 + Math.exp(-advantage / 16))
          ? { home: 5, away: 4 }
          : { home: 4, away: 5 }
        : null;
    const won = home > away || (!!penalties && penalties.home > penalties.away);
    const random = rng(seed + ":play:" + stage + ":" + attempt),
      events: MatchEvent[] = [];
    let h = 0,
      a = 0,
      ball: Point = { x: 50, y: 50 };
    let positions = formation
      .map((p) => ({ ...p }))
      .concat(formation.map((p) => ({ x: 100 - p.x, y: 100 - p.y })));
    const name = (index: number) =>
      index < 11
        ? team[index].name
        : countryByName(opponent).xi[index - 11].name;
    function emit(
      kind: MatchEvent["kind"],
      side: "home" | "away",
      text: string,
      target: Point,
      owner: number | null = null,
      flight = false,
    ) {
      if (kind === "goal") {
        if (side === "home") h++;
        else a++;
      }
      ball = { ...target };
      events.push({
        minute: 0,
        kind,
        side,
        text,
        home: h,
        away: a,
        ...ball,
        positions: positions.map((p) => ({ ...p })),
        owner,
        flight,
      });
    }
    function shape(side: "home" | "away", target: Point, carrier: number) {
      const homeAttack = side === "home";
      positions = positions.map((p, i) => {
        const awayTeam = i >= 11,
          role = i % 11,
          basePoint = formation[role];
        const teamHasBall = awayTeam ? !homeAttack : homeAttack;
        let x = awayTeam ? 100 - basePoint.x : basePoint.x,
          y = awayTeam ? 100 - basePoint.y : basePoint.y;
        if (role === 0) {
          return {
            x: awayTeam ? 93 : 7,
            y: clamp(50 + (target.y - 50) * 0.2, 38, 62),
          };
        }
        x += (target.x - 50) * (teamHasBall ? 0.26 : 0.18);
        y += (target.y - 50) * 0.15;
        return {
          x: clamp(p.x + (x - p.x) * 0.55, 8, 92),
          y: clamp(p.y + (y - p.y) * 0.55, 9, 91),
        };
      });
      positions[carrier] = { ...target };
      // Nearest defender closes the ball rather than oscillating independently.
      const defenders = positions
        .map((p, i) => ({ p, i }))
        .filter((v) => v.i >= 11 === homeAttack && v.i % 11 !== 0);
      const nearest = defenders.sort(
        (a, b) =>
          Math.hypot(a.p.x - target.x, a.p.y - target.y) -
          Math.hypot(b.p.x - target.x, b.p.y - target.y),
      )[0];
      if (nearest)
        positions[nearest.i] = {
          x: clamp(target.x + (homeAttack ? 5 : -5), 8, 92),
          y: clamp(target.y + 4, 9, 91),
        };
    }
    function restart(side: "home" | "away") {
      positions = formation
        .map((p) => ({ ...p }))
        .concat(formation.map((p) => ({ x: 100 - p.x, y: 100 - p.y })));
      const owner = side === "home" ? 6 : 17;
      positions[owner] = { x: 50, y: 50 };
      emit(
        "kickoff",
        side,
        "Play restarts from the centre spot.",
        { x: 50, y: 50 },
        owner,
      );
    }
    restart("home");
    const chances: Array<{ side: "home" | "away"; goal: boolean }> = [
      ...Array.from({ length: home }, () => ({
        side: "home" as const,
        goal: true,
      })),
      ...Array.from({ length: away }, () => ({
        side: "away" as const,
        goal: true,
      })),
    ];
    const possession = clamp(
      Math.round(
        50 +
          advantage * 0.55 +
          (config.tactic === "attack"
            ? 4
            : config.tactic === "counter"
              ? -4
              : 0),
      ),
      33,
      67,
    );
    while (chances.length < Math.max(10, home + away + 2))
      chances.push({
        side: random() < possession / 100 ? "home" : "away",
        goal: false,
      });
    for (let i = chances.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [chances[i], chances[j]] = [chances[j], chances[i]];
    }
    for (let n = 0; n < chances.length; n++) {
      if (n === Math.floor(chances.length / 2)) {
        emit("half", "home", "Half-time. Both sides regroup.", ball);
        restart("away");
      }
      const { side, goal } = chances[n],
        offset = side === "home" ? 0 : 11,
        dir = side === "home" ? 1 : -1;
      const midfield = offset + 5 + Math.floor(random() * 3),
        forward = offset + 8 + Math.floor(random() * 3),
        defender = offset + 1 + Math.floor(random() * 4);
      // A real turnover is shown at the existing ball position before a new attack.
      shape(side, ball, defender);
      emit(
        "interception",
        side,
        [
          `${name(defender)} reads it brilliantly — possession recovered!`,
          `${name(defender)} steps in. A chance to turn defence into attack.`,
          `Strong challenge from ${name(defender)}. They can build now.`,
        ][Math.floor(random() * 3)],
        ball,
        defender,
      );
      const midTarget = {
        x: clamp(ball.x + dir * 12, 30, 70),
        y: 20 + random() * 60,
      };
      shape(side, midTarget, midfield);
      emit(
        "pass",
        side,
        name(defender) + " finds " + name(midfield) + ".",
        midTarget,
        midfield,
        true,
      );
      const carry = {
        x: side === "home" ? 65 : 35,
        y: clamp(midTarget.y + (random() - 0.5) * 16, 15, 85),
      };
      shape(side, carry, midfield);
      emit(
        "carry",
        side,
        [
          `${name(midfield)} drives into the space. The defence is backing off!`,
          `${name(midfield)} has room to run — support arriving on both sides.`,
          `Here comes ${name(midfield)}, carrying them up the pitch.`,
        ][Math.floor(random() * 3)],
        carry,
        midfield,
      );
      const target = { x: side === "home" ? 81 : 19, y: 30 + random() * 40 };
      shape(side, target, forward);
      emit(
        "pass",
        side,
        name(midfield) + " slips the ball to " + name(forward) + ".",
        target,
        forward,
        true,
      );
      const keeper = side === "home" ? 11 : 0,
        goalTarget = { x: side === "home" ? 97 : 3, y: 43 + random() * 14 };
      const miss = !goal && random() < 0.35;
      const shotTarget = goal
        ? goalTarget
        : miss
          ? { x: goalTarget.x, y: random() < 0.5 ? 27 : 73 }
          : { x: positions[keeper].x, y: positions[keeper].y };
      emit(
        "shot",
        side,
        [
          `${name(forward)} sets it up... STRIKES IT!`,
          `${name(forward)} lets fly! The keeper has work to do!`,
          `One touch, a look up — ${name(forward)} goes for goal!`,
        ][Math.floor(random() * 3)],
        shotTarget,
        null,
        true,
      );
      if (goal) {
        emit("goal", side, name(forward) + " scores!", shotTarget);
        events[events.length - 1].scorer = name(forward);
        events[events.length - 1].scorerId =
          forward < 11
            ? team[forward].id
            : String(countryByName(opponent).xi[forward - 11].number);
        events[events.length - 1].assistId =
          midfield < 11
            ? team[midfield].id
            : String(countryByName(opponent).xi[midfield - 11].number);
        events[events.length - 1].assist = name(midfield);
        restart(side === "home" ? "away" : "home");
      } else if (miss) {
        emit("miss", side, "Just wide. A goal kick follows.", shotTarget);
        const next = side === "home" ? "away" : "home";
        const g = next === "home" ? 0 : 11;
        emit(
          "save",
          next,
          "The goalkeeper takes the goal kick.",
          positions[g],
          g,
          true,
        );
      } else {
        emit(
          "save",
          side === "home" ? "away" : "home",
          [
            "SAFE HANDS! The goalkeeper takes the sting out of it.",
            "Denied! The keeper gets right behind the strike.",
            "A big save. That could prove crucial.",
          ][Math.floor(random() * 3)],
          positions[keeper],
          keeper,
        );
      }
    }
    emit(
      "full",
      "home",
      penalties
        ? `Level at full-time. Nigeria ${won ? "win" : "lose"} the deciding shoot-out ${penalties.home}–${penalties.away}.`
        : won
          ? "Full-time. Nigeria march on!"
          : stage.startsWith("Group")
            ? home === away
              ? "Full-time. Honours even — one point each."
              : "Full-time. A setback, but qualification is still decided by the table."
            : "Full-time. Nigeria bow out.",
      ball,
    );
    // Condensed highlights keep chronological football time, with a real half-time marker.
    const half = events.findIndex((e) => e.kind === "half");
    events.forEach(
      (e, i) =>
        (e.minute =
          i <= half
            ? Math.round((i / half) * 45)
            : Math.round(45 + ((i - half) / (events.length - 1 - half)) * 45)),
    );
    for (const e of events) {
      if (e.kind === "goal") {
        const lead = e.side === "home" ? e.home - e.away : e.away - e.home;
        const who = e.scorer || opponent;
        e.text =
          e.minute >= 85
            ? lead === 1
              ? `UNBELIEVABLE! ${who} may have won it at the death!`
              : lead === 0
                ? `DRAMA! ${who} snatches a last-gasp equaliser!`
                : lead < 0
                  ? `${who} pulls one back. Is there time for another twist?`
                  : `${who} puts it beyond doubt! What a finish!`
            : lead === 0
              ? `${who} brings it level! The stadium erupts!`
              : lead === 1
                ? `${who} breaks through! A huge goal — they lead!`
                : `${who} finds the net with a brilliant finish!`;
      }
    }
    return {
      stage,
      opponent,
      won,
      home,
      away,
      penalties,
      events,
      homeShots: events.filter((e) => e.kind === "shot" && e.side === "home")
        .length,
      awayShots: events.filter((e) => e.kind === "shot" && e.side === "away")
        .length,
      possession,
    };
  }
  const tournament = createWorldCup(seed + ":cup:" + attempt, play);
  const matches = tournament.nigeriaMatches;
  const wins = matches.filter((m) => m.won).length;
  return {
    strength: rating,
    chemistry: chemistry(team),
    matches,
    wins,
    tournament,
    title:
      tournament.champion === "Nigeria"
        ? wins === 7
          ? "7–0 Champions!"
          : "World champions!"
        : matches.at(-1)?.stage === "Final"
          ? "Runners-up"
          : matches.at(-1)?.stage === "Semi-final"
            ? "Reached the semi-final"
            : matches.at(-1)?.stage === "Quarter-final"
              ? "Reached the quarter-final"
              : matches.at(-1)?.stage === "Round of 16"
                ? "Reached the round of 16"
                : "Group stage exit",
  };
}
export type Result = ReturnType<typeof simulate>;
