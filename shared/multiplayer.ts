import type { options, simulateDuel } from "./game.ts";
export type RoomState = {
  code: string;
  phase: "waiting" | "draft" | "finished" | "cancelled";
  expiresAt: string;
  you: number;
  players: { id: string; name: string; count: number; picks?: string[] }[];
  picks: string[];
  choices: ReturnType<typeof options> | null;
  result: ReturnType<typeof simulateDuel> | null;
};
export type RoomCredentials = { code: string; token: string };
