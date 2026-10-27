import raw from "./countries.json" with { type: "json" };
import { rng } from "./random.ts";
export const countries = raw;
export function countryByName(name: string) {
  const country = countries.find((c) => c.name === name);
  if (!country) throw Error("Unknown nation: " + name);
  return country;
}
export const groups = [
  ["Nigeria", "Ecuador", "Senegal", "Netherlands"],
  ["England", "IR Iran", "USA", "Wales"],
  ["Argentina", "Saudi Arabia", "Mexico", "Poland"],
  ["France", "Australia", "Denmark", "Tunisia"],
  ["Spain", "Costa Rica", "Germany", "Japan"],
  ["Belgium", "Canada", "Morocco", "Croatia"],
  ["Brazil", "Serbia", "Switzerland", "Cameroon"],
  ["Portugal", "Ghana", "Uruguay", "Korea Republic"],
];
export const ratings: Record<string, number> = {
  Nigeria: 83,
  Argentina: 88,
  Australia: 74,
  Belgium: 84,
  Brazil: 90,
  Cameroon: 75,
  Canada: 74,
  "Costa Rica": 72,
  Croatia: 84,
  Denmark: 81,
  Ecuador: 77,
  England: 86,
  France: 89,
  Germany: 85,
  Ghana: 74,
  "IR Iran": 73,
  Japan: 78,
  "Korea Republic": 77,
  Mexico: 78,
  Morocco: 82,
  Netherlands: 85,
  Poland: 78,
  Portugal: 86,
  "Saudi Arabia": 72,
  Senegal: 80,
  Serbia: 78,
  Spain: 86,
  Switzerland: 80,
  Tunisia: 73,
  Uruguay: 82,
  USA: 77,
  Wales: 75,
};
export type Goal = {
  minute: number;
  side: "home" | "away";
  scorer: string;
  scorerId?: string;
  assistId?: string;
  assist?: string;
};
export type Fixture = {
  id: number;
  stage: string;
  group?: number;
  homeTeam: string;
  awayTeam: string;
  home: number;
  away: number;
  penalties: { home: number; away: number } | null;
  goals: Goal[];
  nigeriaIndex?: number;
};
export type Row = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
};
export function table(names: string[], fixtures: Fixture[]): Row[] {
  return names
    .map((team) => {
      const row: Row = {
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        points: 0,
      };
      for (const f of fixtures) {
        if (f.homeTeam !== team && f.awayTeam !== team) continue;
        const own = f.homeTeam === team ? f.home : f.away,
          other = f.homeTeam === team ? f.away : f.home;
        row.played++;
        row.gf += own;
        row.ga += other;
        if (own > other) {
          row.won++;
          row.points += 3;
        } else if (own === other) {
          row.drawn++;
          row.points++;
        } else row.lost++;
      }
      return row;
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.gf - b.ga - (a.gf - a.ga) ||
        b.gf - a.gf ||
        a.team.localeCompare(b.team),
    );
}
export function playerLeaders(fixtures: Fixture[]) {
  const stats = new Map<
    string,
    {
      id: string;
      name: string;
      country: string;
      goals: number;
      assists: number;
    }
  >();
  for (const f of fixtures)
    for (const g of f.goals) {
      const country = g.side === "home" ? f.homeTeam : f.awayTeam;
      for (const [name, key, playerId] of [
        [g.scorer, "goals", g.scorerId],
        [g.assist, "assists", g.assistId],
      ] as const) {
        if (!name) continue;
        const id = country + ":" + (playerId || name),
          record = stats.get(id) || { id, name, country, goals: 0, assists: 0 };
        record[key]++;
        stats.set(id, record);
      }
    }
  const all = [...stats.values()];
  return {
    scorers: [...all]
      .sort(
        (a, b) =>
          b.goals - a.goals ||
          b.assists - a.assists ||
          a.name.localeCompare(b.name),
      )
      .filter((p) => p.goals > 0),
    assisters: [...all]
      .sort(
        (a, b) =>
          b.assists - a.assists ||
          b.goals - a.goals ||
          a.name.localeCompare(b.name),
      )
      .filter((p) => p.assists > 0),
  };
}
type Match = {
  home: number;
  away: number;
  won: boolean;
  penalties: { home: number; away: number } | null;
  events: {
    kind: string;
    side: "home" | "away";
    minute: number;
    scorer?: string;
    scorerId?: string;
    assistId?: string;
    assist?: string;
  }[];
};
export function createWorldCup<T extends Match>(
  seed: string,
  play: (stage: string, opponent: string, rating: number) => T,
) {
  const random = rng(seed),
    fixtures: Fixture[] = [],
    nigeriaMatches: T[] = [];
  function fixture(a: string, b: string, stage: string, group?: number) {
    if (b === "Nigeria") [a, b] = [b, a];
    let home: number,
      away: number,
      penalties: Fixture["penalties"] = null,
      goals: Goal[] = [];
    let nigeriaIndex: number | undefined;
    if (a === "Nigeria") {
      nigeriaIndex = nigeriaMatches.length;
      const m = play(stage, b, ratings[b] || 78);
      nigeriaMatches.push(m);
      ({ home, away, penalties } = m);
      goals = m.events
        .filter((e) => e.kind === "goal")
        .map((e) => ({
          minute: e.minute,
          side: e.side,
          scorer: e.scorer!,
          scorerId: e.scorerId,
          assistId: e.assistId,
          assist: e.assist,
        }));
    } else {
      const gap = (ratings[a] - ratings[b]) / 25;
      home = Math.max(0, Math.min(5, Math.floor(random() * 3.5 + gap)));
      away = Math.max(0, Math.min(5, Math.floor(random() * 3.5 - gap)));
      if (group === undefined && home === away)
        penalties =
          random() < 0.5 ? { home: 5, away: 4 } : { home: 4, away: 5 };
      for (const [side, count, nation] of [
        ["home", home, a],
        ["away", away, b],
      ] as const) {
        const xi = countryByName(nation).xi;
        for (let i = 0; i < count; i++) {
          const striker = xi[8 + Math.floor(random() * 3)],
            provider = xi[5 + Math.floor(random() * 3)];
          goals.push({
            minute: 3 + Math.floor(random() * 88),
            side,
            scorer: striker.name,
            scorerId: String(striker.number),
            assistId: String(provider.number),
            assist: random() < 0.83 ? provider.name : undefined,
          });
        }
      }
      goals.sort((a, b) => a.minute - b.minute);
    }
    const result: Fixture = {
      id: fixtures.length,
      stage,
      group,
      homeTeam: a,
      awayTeam: b,
      home,
      away,
      penalties,
      goals,
      nigeriaIndex,
    };
    fixtures.push(result);
    return result;
  }
  const rounds = [
    [
      [0, 1],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 3],
    ],
    [
      [0, 3],
      [1, 2],
    ],
  ];
  for (let day = 0; day < 3; day++)
    for (let g = 0; g < 8; g++)
      for (const [a, b] of rounds[day])
        fixture(groups[g][a], groups[g][b], `Group · ${day + 1}`, g);
  const qualified = groups.map((names, g) =>
    table(
      names,
      fixtures.filter((f) => f.group === g),
    )
      .slice(0, 2)
      .map((r) => r.team),
  );
  const pairs = [
    [0, 0, 1, 1],
    [2, 0, 3, 1],
    [4, 0, 5, 1],
    [6, 0, 7, 1],
    [1, 0, 0, 1],
    [3, 0, 2, 1],
    [5, 0, 4, 1],
    [7, 0, 6, 1],
  ];
  const winner = (f: Fixture) =>
    f.home > f.away || (f.penalties && f.penalties.home > f.penalties.away)
      ? f.homeTeam
      : f.awayTeam;
  let remaining = pairs.map(([a, ar, b, br]) =>
    winner(fixture(qualified[a][ar], qualified[b][br], "Round of 16")),
  );
  for (const stage of ["Quarter-final", "Semi-final", "Final"]) {
    const next: string[] = [];
    for (let i = 0; i < remaining.length; i += 2)
      next.push(winner(fixture(remaining[i], remaining[i + 1], stage)));
    remaining = next;
  }
  return { fixtures, nigeriaMatches, champion: remaining[0] };
}
