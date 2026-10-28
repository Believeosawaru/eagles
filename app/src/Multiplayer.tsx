import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Share,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, ApiError } from "./api";
import type { RoomState, RoomCredentials } from "../../shared/multiplayer";
import { players } from "../../shared/game";
import Portrait from "./Portrait";
import Pitch from "./Pitch";
import { useReducedMotion } from "react-native-reanimated";
import Brand, { BrandedLoader } from "./Brand";
const KEY = "eagles-room-v1";
export default function Multiplayer({ manager }: { manager: string }) {
  const [credentials, setCredentials] = useState<RoomCredentials | null>(null),
    [state, setState] = useState<RoomState | null>(null),
    [name, setName] = useState(manager || ""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [unavailable, setUnavailable] = useState(false),
    [slow, setSlow] = useState(false),
    [watch, setWatch] = useState(false),
    [frame, setFrame] = useState(0),
    [paused, setPaused] = useState(false),
    [speed, setSpeed] = useState(1);
  const inFlight = useRef(false),
    reduce = useReducedMotion();
  useEffect(() => {
    let live = true;
    void AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!live || !raw) return;
        try {
          const c = JSON.parse(raw);
          if (/^[A-F0-9]{8}$/.test(c.code) && /^[a-f0-9]{64}$/.test(c.token))
            setCredentials(c);
        } catch {}
      })
      .finally(() => {
        if (live) setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, []);
  function apply(next: RoomState) {
    setState((prev) =>
      prev?.code === next.code &&
      (prev.picks.length > next.picks.length ||
        (prev.phase === "finished" && next.phase !== "finished") ||
        prev.phase === "cancelled")
        ? prev
        : next,
    );
  }
  useEffect(() => {
    if (
      !credentials ||
      !loaded ||
      unavailable ||
      state?.phase === "finished" ||
      state?.phase === "cancelled"
    )
      return;
    let live = true;
    async function poll() {
      if (inFlight.current) return;
      inFlight.current = true;
      const t = setTimeout(() => {
        if (live) setSlow(true);
      }, 2500);
      try {
        const next = await api<RoomState>(
          "/api/rooms/" + credentials!.code,
          undefined,
          credentials!.token,
        );
        if (live) {
          apply(next);
          setError("");
        }
      } catch (e) {
        if (live) {
          setError((e as Error).message);
          if (e instanceof ApiError && [401, 403, 404].includes(e.status))
            setUnavailable(true);
        }
      } finally {
        inFlight.current = false;
        clearTimeout(t);
        if (live) setSlow(false);
      }
    }
    void poll();
    const t = setInterval(() => void poll(), 2500);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [credentials, loaded, state?.phase, unavailable]);
  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(() => setSlow(true), 2500);
    return () => {
      clearTimeout(t);
      setSlow(false);
    };
  }, [busy]);
  async function connect(join: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await api<{ token: string; state: RoomState }>(
        join ? `/api/rooms/${code.trim().toUpperCase()}/join` : "/api/rooms",
        { name: name.trim() },
      );
      const next = { code: response.state.code, token: response.token };
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      setUnavailable(false);
      setState(response.state);
      setCredentials(next);
      setWatch(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function pick(id: string) {
    if (!credentials || !state || busy) return;
    setBusy(true);
    setError("");
    try {
      apply(
        await api<RoomState>(
          `/api/rooms/${credentials.code}/pick`,
          { choice: id, count: state.picks.length },
          credentials.token,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function leave() {
    const c = credentials;
    setUnavailable(false);
    setCredentials(null);
    setState(null);
    setWatch(false);
    setError("");
    void AsyncStorage.removeItem(KEY);
    if (c) void api(`/api/rooms/${c.code}/leave`, {}, c.token).catch(() => {});
  }
  const match = state?.result,
    events = match?.events || [];
  const timeline = useMemo(() => {
    let total = 0;
    return events.map((e) => {
      const start = total;
      total += e.kind === "goal" ? 30 : e.kind === "half" ? 20 : 7;
      return { start, end: total };
    });
  }, [match]);
  const total = timeline.at(-1)?.end || 1,
    complete = frame >= total,
    index = complete
      ? events.length - 1
      : Math.max(
          0,
          timeline.findIndex((t) => frame < t.end),
        ),
    event = events[index];
  useEffect(() => {
    if (!watch || paused || complete) return;
    const t = setInterval(
      () => setFrame((f) => Math.min(total, f + speed / 3)),
      33,
    );
    return () => clearInterval(t);
  }, [watch, paused, complete, total, speed]);
  const button = (
    label: string,
    action: () => void,
    secondary = false,
    disabled = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      onPress={action}
      disabled={disabled}
      style={[
        s.button,
        secondary && { backgroundColor: "#204730" },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: "#e9f2d9" }]}>
        {label}
      </Text>
    </Pressable>
  );
  if (!loaded) return <BrandedLoader message="Checking your room…" />;
  return (
    <View>
      <Brand size={65} />
      <Text style={s.kicker}>ONLINE TWO-PLAYER</Text>
      <Text style={s.title}>Your XI. Their XI.</Text>
      <Text style={s.body}>
        Two managers. One draft pool. A head-to-head match decided by the
        server.
      </Text>
      {!credentials && (
        <>
          <TextInput
            style={s.input}
            accessibilityLabel="Multiplayer manager name"
            value={name}
            onChangeText={setName}
            maxLength={24}
            placeholder="Your manager name"
            placeholderTextColor="#94ae98"
          />
          {button(
            "Create a room",
            () => void connect(false),
            false,
            busy || name.trim().length < 2,
          )}
          <Text style={s.kicker}>HAVE A FRIEND’S CODE?</Text>
          <TextInput
            accessibilityLabel="Room code"
            style={s.input}
            value={code}
            onChangeText={setCode}
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="8-character room code"
            placeholderTextColor="#94ae98"
          />
          {button(
            "Join room",
            () => void connect(true),
            true,
            busy || code.trim().length !== 8 || name.trim().length < 2,
          )}
        </>
      )}
      {credentials && (
        <>
          <View style={s.panel}>
            <Text style={s.kicker}>ROOM CODE</Text>
            <Text selectable style={s.code}>
              {credentials.code}
            </Text>
            {button(
              "Invite a friend",
              () =>
                void Share.share({
                  message: `Join my Eagles 7–0 room: ${credentials.code}. Open Online multiplayer and enter the code. Rooms last 30 minutes.`,
                }).catch(() =>
                  setError("Copy the room code above to invite your friend."),
                ),
              true,
            )}
            <Text style={s.small}>
              Keep this screen open. Rooms expire after 30 minutes.
            </Text>
          </View>
          {!state &&
            (unavailable ? (
              <Text style={s.body}>
                This room is no longer available. Leave it to create a new
                challenge.
              </Text>
            ) : (
              <BrandedLoader message="Reconnecting to your room…" />
            ))}
          {state && (
            <>
              <View style={s.row}>
                {state.players.map((p, i) => (
                  <View
                    key={p.id}
                    style={[
                      s.manager,
                      { borderColor: i === state.you ? "#d6f395" : "#274e34" },
                    ]}
                  >
                    <Text style={s.name}>
                      {p.name}
                      {i === state.you ? " (you)" : ""}
                    </Text>
                    <Text style={s.small}>
                      {i === 0 ? "HOME" : "AWAY"} · {p.count}/11 drafted
                    </Text>
                    <View style={s.track}>
                      <View
                        style={{
                          height: 4,
                          width: `${(p.count / 11) * 100}%`,
                          backgroundColor: "#d6f395",
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
              {state.phase === "waiting" && (
                <Text style={s.body}>
                  Waiting for a friend to join with the code above. They need a
                  different browser/device so they have their own seat.
                </Text>
              )}
              {state.phase === "cancelled" && (
                <Text style={s.body}>
                  A manager ended this room. Leave and create a fresh challenge.
                </Text>
              )}
              {state.phase === "draft" && (
                <>
                  {state.choices ? (
                    <>
                      <Text style={s.kicker}>
                        {state.choices.era} · PICK {state.picks.length + 1} OF
                        11
                      </Text>
                      <View style={s.cards}>
                        {state.choices.players.map((p) => (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Sign multiplayer ${p.name}`}
                            key={p.id}
                            style={s.card}
                            onPress={() => void pick(p.id)}
                            disabled={busy}
                          >
                            <Portrait player={p} size={120} />
                            <Text style={s.rating}>{p.rating}</Text>
                            <Text style={s.name}>{p.name}</Text>
                            <Text style={s.small}>{p.position}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  ) : (
                    <Text style={s.body}>
                      Your XI is ready. Waiting for the other manager to finish
                      drafting…
                    </Text>
                  )}
                  <Text style={s.small}>
                    Opponent selections stay hidden until both XIs are complete.
                    No client can submit a score.
                  </Text>
                </>
              )}
              {state.phase === "finished" && match && (
                <>
                  {!watch ? (
                    <>
                      {button("Watch our head-to-head  →", () => {
                        setWatch(true);
                        setFrame(0);
                        setPaused(false);
                      })}
                      <Text style={s.body}>
                        Both teams are locked. The match result is saved on the
                        server for both managers.
                      </Text>
                    </>
                  ) : (
                    event && (
                      <>
                        <View style={s.scoreboard}>
                          <Text style={s.name}>{state.players[0].name}</Text>
                          <Text style={s.score}>
                            {event.home} : {event.away}
                          </Text>
                          <Text style={s.name}>{state.players[1].name}</Text>
                        </View>
                        <Text style={s.kicker}>
                          {complete
                            ? "FULL TIME"
                            : `${event.minute}′ ${paused ? "PAUSED" : "LIVE"}`}
                          {complete && match.penalties
                            ? ` · PENS ${match.penalties.home}–${match.penalties.away}`
                            : ""}
                        </Text>
                        <Pitch
                          team={state.players[0].picks!.map((id) =>
                            players.find((p) => p.id === id)!,
                          )}
                          event={event}
                          previous={events[Math.max(0, index - 1)]}
                          progress={
                            complete
                              ? 1
                              : (frame - timeline[index].start) /
                                (timeline[index].end - timeline[index].start)
                          }
                          reduceMotion={reduce}
                        />
                        <View style={s.panel}>
                          <Text style={s.name}>
                            {event.text.replaceAll(
                              "Nigeria",
                              state.players[0].name + "’s XI",
                            )}
                          </Text>
                        </View>
                        <View style={s.row}>
                          {button(
                            paused ? "Resume" : "Pause",
                            () => setPaused((v) => !v),
                            true,
                            complete,
                          )}
                          {[1, 2, 4].map((v) => (
                            <Pressable
                              accessibilityRole="button"
                              key={v}
                              onPress={() => setSpeed(v)}
                              style={s.speed}
                            >
                              <Text
                                style={{
                                  color: v === speed ? "#d6f395" : "#adc2a1",
                                }}
                              >
                                {v}×
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        {complete && (
                          <>
                            <Text style={s.title}>
                              {state.players[match.won ? 0 : 1].name} wins!
                            </Text>
                            {button(
                              "Replay match",
                              () => {
                                setFrame(0);
                                setPaused(false);
                              },
                              true,
                            )}
                          </>
                        )}
                      </>
                    )
                  )}
                  {state.players.map((p) => (
                    <View key={p.id} style={s.panel}>
                      <Text style={s.kicker}>
                        {p.name.toUpperCase()} · LOCKED XI
                      </Text>
                      {p.picks?.map((id) => (
                        <Text key={id} style={s.roster}>
                          {players.find((x) => x.id === id)?.name}
                        </Text>
                      ))}
                    </View>
                  ))}
                  <Text style={s.small}>
                    Same server result for both players. Playback is local and
                    can be paused independently. Balanced tactics; no captain
                    bonus in this mode.
                  </Text>
                </>
              )}
            </>
          )}
          {button("Leave room", leave, true, busy)}
        </>
      )}
      {(busy || slow) && (
        <Text style={s.body}>
          {slow ? "Waking up or reconnecting to the server…" : "Connecting…"}
        </Text>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <Text style={s.foot}>
        Requires the configured backend and internet. Regular solo Play stays
        available offline.
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  kicker: {
    fontFamily: "Fredoka_500Medium",
    fontSize: 11,
    color: "#bdd49a",
    letterSpacing: 1,
    marginTop: 18,
  },
  title: {
    fontFamily: "Fredoka_700Bold",
    fontSize: 32,
    color: "#eef4df",
    marginTop: 14,
  },
  body: {
    fontFamily: "Fredoka_500Medium",
    fontSize: 14,
    lineHeight: 23,
    color: "#a9c0a5",
    marginVertical: 16,
  },
  input: {
    fontFamily: "Fredoka_500Medium",
    padding: 17,
    borderRadius: 14,
    backgroundColor: "#143c2b",
    color: "#eff5df",
    fontSize: 16,
    marginVertical: 10,
  },
  button: {
    padding: 17,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#d6f395",
    marginVertical: 7,
  },
  buttonText: { fontFamily: "Fredoka_700Bold", fontSize: 14, color: "#123c29" },
  panel: {
    backgroundColor: "#123a29",
    padding: 17,
    borderRadius: 18,
    marginVertical: 14,
  },
  code: {
    fontFamily: "Fredoka_700Bold",
    fontSize: 35,
    letterSpacing: 3,
    color: "#d6f395",
    marginVertical: 10,
  },
  small: {
    fontFamily: "Fredoka_500Medium",
    fontSize: 10,
    lineHeight: 16,
    color: "#9eb798",
  },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  manager: {
    flex: 1,
    padding: 13,
    borderWidth: 1,
    borderRadius: 13,
    backgroundColor: "#123427",
  },
  name: {
    fontFamily: "Fredoka_500Medium",
    fontSize: 14,
    lineHeight: 21,
    color: "#edf5df",
    flexShrink: 1,
  },
  track: {
    height: 4,
    backgroundColor: "#31513a",
    marginTop: 12,
    borderRadius: 4,
    overflow: "hidden",
  },
  cards: { flexDirection: "row", gap: 8, marginVertical: 16 },
  card: { flex: 1, padding: 8, borderRadius: 13, backgroundColor: "#143d2a" },
  rating: {
    fontFamily: "Fredoka_700Bold",
    fontSize: 25,
    color: "#d6f395",
    marginVertical: 8,
  },
  scoreboard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginVertical: 22,
  },
  score: { fontFamily: "Fredoka_700Bold", fontSize: 40, color: "#d6f395" },
  speed: { padding: 10, backgroundColor: "#123a29", borderRadius: 20 },
  roster: {
    fontFamily: "Fredoka_500Medium",
    fontSize: 13,
    color: "#dcebc9",
    paddingVertical: 5,
  },
  error: {
    fontFamily: "Fredoka_500Medium",
    fontSize: 13,
    color: "#ffb69d",
    lineHeight: 22,
    marginVertical: 12,
  },
  foot: {
    fontFamily: "Fredoka_500Medium",
    fontSize: 10,
    lineHeight: 17,
    color: "#8da78e",
    marginTop: 22,
    textAlign: "center",
  },
});
