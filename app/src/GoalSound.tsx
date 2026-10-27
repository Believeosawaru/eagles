import { useEffect } from "react";
import { useAudioPlayer } from "expo-audio";
// Mounted only after client hydration so static web rendering never creates Audio.
export default function GoalSound({
  trigger,
  enabled,
}: {
  trigger: string;
  enabled: boolean;
}) {
  const player = useAudioPlayer(require("../assets/goal.wav"));
  useEffect(() => {
    if (!enabled || !trigger) return;
    void player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => {});
  }, [trigger, enabled, player]);
  return null;
}
