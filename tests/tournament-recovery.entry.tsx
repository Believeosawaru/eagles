import React from "react";
import TournamentHub from "../app/src/TournamentHub";
import type { Result } from "../shared/game";
export function RecoveryCase({
  result,
  index = 0,
}: {
  result: unknown;
  index?: number;
}) {
  return (
    <TournamentHub
      result={result as Result}
      team={[]}
      manager="Coach"
      matchIndex={index}
      completed={false}
      finished={false}
      onRecover={() => {}}
    />
  );
}
