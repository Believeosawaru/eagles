import type { Result } from "../../shared/game";
import { countries } from "../../shared/worldcup";
const nations = new Set(["Nigeria", ...countries.map((c) => c.name)]);
/** Runtime boundary: old or partially refreshed results may lack tournament data. */
export function tournamentState(
  result: Result | null | undefined,
  matchIndex: number,
) {
  const cup = result?.tournament;
  if (
    !cup ||
    !Array.isArray(cup.fixtures) ||
    cup.fixtures.length === 0 ||
    !nations.has(cup.champion)
  )
    return null;
  if (
    !cup.fixtures.every(
      (f) =>
        f &&
        Number.isInteger(f.id) &&
        typeof f.stage === "string" &&
        nations.has(f.homeTeam) &&
        nations.has(f.awayTeam) &&
        Number.isFinite(f.home) &&
        Number.isFinite(f.away) &&
        Array.isArray(f.goals),
    )
  )
    return null;
  if (!Number.isInteger(matchIndex) || matchIndex < 0) return null;
  const own = cup.fixtures.find((f) => f.nigeriaIndex === matchIndex);
  return own ? { cup, own } : null;
}
