import type { Config, Result } from "../../shared/game";
import type { Daily } from "./api";
export type Session = {
  id: string;
  seed: string;
  matchSeed?: string;
  managerName?: string;
  daily: Daily | null;
  picks: string[];
  config: Config;
  stage: "draft" | "ready" | "match" | "result";
  matchIndex: number;
};
export type History = {
  id: string;
  at: string;
  seed: string;
  matchSeed?: string;
  managerName?: string;
  picks: string[];
  config: Config;
  result: Pick<Result, "wins" | "strength" | "title">;
  daily: boolean;
};
export type Saved = {
  session: Session | null;
  history: History[];
  favorites: string[];
  sound: boolean;
  haptics: boolean;
  tutorial: boolean;
  managerName: string;
};
export const initial: Saved = {
  session: null,
  history: [],
  favorites: [],
  sound: false,
  haptics: true,
  tutorial: true,
  managerName: "",
};
export const badges = [
  {
    id: "debut",
    title: "First whistle",
    text: "Finish your first run.",
    test: (h: History[]) => h.length > 0,
  },
  {
    id: "five",
    title: "Five-a-side",
    text: "Finish five runs.",
    test: (h: History[]) => h.length >= 5,
  },
  {
    id: "knockout",
    title: "Out of the group",
    text: "Win three games in a run.",
    test: (h: History[]) => h.some((r) => r.result.wins >= 3),
  },
  {
    id: "final",
    title: "Final frontier",
    text: "Reach the final.",
    test: (h: History[]) => h.some((r) => r.result.wins >= 6),
  },
  {
    id: "champion",
    title: "Perfect seven",
    text: "Win all seven matches.",
    test: (h: History[]) => h.some((r) => r.result.wins === 7),
  },
  {
    id: "daily",
    title: "Daily ritual",
    text: "Finish a daily run.",
    test: (h: History[]) => h.some((r) => r.daily),
  },
  {
    id: "legend",
    title: "Fearless",
    text: "Win three games on Legend.",
    test: (h: History[]) =>
      h.some((r) => r.config.difficulty === "legend" && r.result.wins >= 3),
  },
];
