import Brand, { BrandedLoader } from "../src/Brand";
import Multiplayer from "../src/Multiplayer";
import TournamentHub from "../src/TournamentHub";
import { playful } from "../src/theme";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
  ActivityIndicator,
  Modal,
  Linking,
  Share,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useReducedMotion } from "react-native-reanimated";
import GoalSound from "../src/GoalSound";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  players,
  options,
  lineup,
  simulate,
  slots,
  eras,
  strength,
  chemistry,
  defaultConfig,
  opponents,
  type Player,
  type Tactic,
  type Difficulty,
  type Config,
} from "../../shared/game";
import { api, type Daily, type Score } from "../src/api";
import {
  initial,
  badges,
  type Saved,
  type Session,
  type History,
} from "../src/store";
import Portrait from "../src/Portrait";
import Pitch from "../src/Pitch";
import Art from "../src/Art";
import credits from "../src/photos.json";
import { shareCard } from "../src/share";
type Screen =
  | "home"
  | "draft"
  | "ready"
  | "match"
  | "result"
  | "collection"
  | "history"
  | "board"
  | "settings"
  | "tournament"
  | "multiplayer";
const KEY = "eagles70-v4";
const label = {
  balanced: "Balanced",
  attack: "Front foot",
  counter: "Counter attack",
};
export default function Game() {
  const [saved, setSaved] = useState<Saved>(initial),
    [hydrated, setHydrated] = useState(false),
    [screen, setScreen] = useState<Screen>("home"),
    [profile, setProfile] = useState<Player | null>(null),
    [search, setSearch] = useState(""),
    [position, setPosition] = useState("ALL"),
    [eraFilter, setEraFilter] = useState("ALL"),
    [onlyFavorites, setOnlyFavorites] = useState(false),
    [busy, setBusy] = useState(false),
    [slow, setSlow] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [dailyBoard, setDailyBoard] = useState<Daily | null>(null),
    [board, setBoard] = useState<Score[]>([]),
    [spinning, setSpinning] = useState(false),
    [spinTick, setSpinTick] = useState(0),
    [frame, setFrame] = useState(0),
    [paused, setPaused] = useState(false),
    [speed, setSpeed] = useState(1),
    [replay, setReplay] = useState(false),
    [name, setName] = useState(""),
    [submitted, setSubmitted] = useState(false),
    [sharing, setSharing] = useState(false),
    [code, setCode] = useState("");
  const reduce = useReducedMotion(),
    card = useRef<ComponentRef<typeof View>>(null);
  const [simulationRevision, setSimulationRevision] = useState(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [screen]);
  const session = saved.session;
  const team = useMemo(
    () =>
      session?.picks
        .map((id) => players.find((p) => p.id === id)!)
        .filter(Boolean) || [],
    [session?.picks],
  );
  const result = useMemo(
    () =>
      session && team.length === 11
        ? simulate(
            team,
            session.seed,
            session.config,
            session.matchSeed || session.seed,
          )
        : null,
    [
      session?.seed,
      session?.matchSeed,
      session?.config,
      team,
      simulate,
      simulationRevision,
    ],
  );
  const match = result?.matches[session?.matchIndex || 0];
  const timeline = useMemo(() => {
    let end = 0;
    return (match?.events || []).map((e) => {
      const start = end;
      end +=
        e.kind === "goal"
          ? 30
          : e.kind === "half"
            ? 20
            : e.kind === "full"
              ? 12
              : e.kind === "carry"
                ? 8
                : 7;
      return { start, end };
    });
  }, [match]);
  const duration = timeline.at(-1)?.end || 1;
  const complete = frame >= duration;
  const eventIndex = complete
    ? Math.max(0, (match?.events.length || 1) - 1)
    : Math.max(
        0,
        timeline.findIndex((t) => frame < t.end),
      );
  const event = match?.events[eventIndex];
  const choice =
    session && session.picks.length < 11
      ? options(session.seed, session.picks)
      : null;
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!live) return;
        if (raw) {
          try {
            const v = JSON.parse(raw);
            if (!Array.isArray(v.history) || !Array.isArray(v.favorites))
              throw Error();
            if (v.session) {
              const x = v.session;
              if (
                typeof x.seed !== "string" ||
                !Array.isArray(x.picks) ||
                x.picks.length > 11 ||
                !x.config
              )
                throw Error();
              x.picks.forEach((id: string, i: number) => {
                if (
                  !options(x.seed, x.picks.slice(0, i)).players.some(
                    (p) => p.id === id,
                  )
                )
                  throw Error();
              });
              if (x.picks.length === 11) {
                const restoredTeam = lineup(x.seed, x.picks);
                const restored = simulate(
                  restoredTeam,
                  x.seed,
                  x.config,
                  x.matchSeed || x.seed,
                );
                x.matchIndex = Math.max(
                  0,
                  Math.min(
                    Number.isInteger(x.matchIndex) ? x.matchIndex : 0,
                    restored.matches.length - 1,
                  ),
                );
                if (!["ready", "match", "result"].includes(x.stage))
                  x.stage = "ready";
              } else {
                x.stage = "draft";
                x.matchIndex = 0;
              }
              delete x.result; // Always regenerate results with the current engine.
            }
            setSaved({
              ...initial,
              ...v,
              managerName:
                typeof v.managerName === "string" ? v.managerName : "",
            });
          } catch {
            setError("Saved data was incompatible and has been reset.");
          }
        }
      })
      .catch(() => setError("Could not load saved progress."))
      .finally(() => {
        if (live) setHydrated(true);
      });
    void api("/api/health").catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (hydrated)
      void AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() =>
        setError("Your browser or device could not save progress."),
      );
  }, [saved, hydrated]);
  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 2500);
    return () => clearTimeout(t);
  }, [busy]);
  useEffect(() => {
    if (!spinning) return;
    const t = setInterval(() => setSpinTick((x) => x + 1), 75),
      end = setTimeout(() => setSpinning(false), reduce ? 80 : 650);
    return () => {
      clearInterval(t);
      clearTimeout(end);
    };
  }, [spinning, reduce]);
  useEffect(() => {
    if (screen !== "match" || paused || complete) return;
    const t = setInterval(
      () => setFrame((f) => Math.min(duration, f + speed / 3)),
      33,
    );
    return () => clearInterval(t);
  }, [screen, paused, complete, speed, duration]);
  useEffect(() => {
    if (screen === "match" && event?.kind === "goal") {
      if (saved.haptics && Platform.OS !== "web")
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
    }
  }, [screen, eventIndex, session?.matchIndex]);
  function update(patch: Partial<Session>) {
    setSaved((s) => ({
      ...s,
      session: s.session ? { ...s.session, ...patch } : null,
    }));
  }
  function navigate(next: Screen) {
    setScreen(next);
    setError("");
    setNotice("");
    setProfile(null);
  }
  function start(
    d: Daily | null = null,
    customSeed?: string,
    difficulty: Difficulty = "standard",
  ) {
    const seed =
      customSeed ||
      d?.seed ||
      `E70-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    setSaved((s) => ({
      ...s,
      session: {
        id: Date.now().toString() + Math.random(),
        seed,
        matchSeed: d ? seed : `attempt-${Date.now()}-${Math.random()}`,
        daily: d,
        managerName: s.managerName.trim() || "Coach",
        picks: [],
        config: { ...defaultConfig, difficulty },
        stage: "draft",
        matchIndex: 0,
      },
    }));
    setReplay(false);
    setName(saved.managerName.trim() || "Coach");
    setSubmitted(false);
    setSpinning(true);
    navigate("draft");
  }
  function pick(p: Player) {
    if (!session || spinning || !choice?.players.some((x) => x.id === p.id))
      return;
    const picks = [...session.picks, p.id];
    update({ picks, stage: picks.length === 11 ? "ready" : "draft" });
    setProfile(null);
    if (saved.haptics && Platform.OS !== "web")
      void Haptics.selectionAsync().catch(() => {});
    if (picks.length === 11) navigate("ready");
    else setSpinning(true);
  }
  function finish() {
    if (!session || !result) return;
    update({ stage: "result" });
    if (!replay) {
      const h: History = {
        id: session.id,
        at: new Date().toISOString(),
        seed: session.seed,
        matchSeed: session.matchSeed,
        picks: session.picks,
        config: session.config,
        result: {
          wins: result.wins,
          strength: result.strength,
          title: result.title,
        },
        daily: !!session.daily,
        managerName: session.managerName,
      };
      setSaved((s) => ({
        ...s,
        session: s.session ? { ...s.session, stage: "result" } : null,
        history: s.history.some((x) => x.id === h.id)
          ? s.history
          : [h, ...s.history].slice(0, 50),
      }));
    }
    navigate("result");
  }
  function kickoff(index = 0) {
    update({ stage: "match", matchIndex: index });
    setFrame(0);
    setPaused(false);
    navigate("match");
  }
  async function load(mode: "daily" | "board") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const d = await api<Daily>("/api/daily");
      if (mode === "daily") start(d);
      else {
        setBoard(await api<Score[]>("/api/leaderboard?date=" + d.date));
        setDailyBoard(d);
        navigate("board");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!session?.daily || !result) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/scores", {
        playerName: name.trim(),
        date: session.daily.date,
        picks: session.picks,
        config: session.config,
      });
      setSubmitted(true);
      setNotice("Your score is on the board.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function favorite(id: string) {
    setSaved((s) => ({
      ...s,
      favorites: s.favorites.includes(id)
        ? s.favorites.filter((x) => x !== id)
        : [...s.favorites, id],
    }));
  }
  function shareCode() {
    if (!session) return;
    const text = `Try my Eagles 7–0 draft. Challenge code: ${session.seed} (Standard difficulty).`;
    void Share.share({ message: text }).catch(() => setNotice(text));
    setNotice(text);
  }
  const button = (
    text: string,
    fn: () => void,
    secondary = false,
    disabled = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={fn}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: "#e8f1df" }]}>
        {text}
      </Text>
    </Pressable>
  );
  const chip = (text: string, active: boolean, fn: () => void) => (
    <Pressable
      key={text}
      accessibilityRole="button"
      onPress={fn}
      style={[s.chip, active && s.chipActive]}
    >
      <Text style={[s.chipText, active && { color: "#123529" }]}>{text}</Text>
    </Pressable>
  );
  const selectedPitch = () => (
    <View style={s.teamPitch}>
      {[[8, 9, 10], [5, 6, 7], [1, 2, 3, 4], [0]].map((row, i) => (
        <View key={i} style={s.formationRow}>
          {row.map((index) => (
            <Pressable
              key={index}
              onPress={() => team[index] && setProfile(team[index])}
              style={s.teamPlayer}
            >
              <View
                style={[
                  s.numberDisc,
                  team[index] && { backgroundColor: "#d6f395" },
                ]}
              >
                <Text style={s.discText}>{team[index]?.rating || "+"}</Text>
              </View>
              <Text numberOfLines={1} style={s.playerName}>
                {team[index]?.name.split(" ").slice(-1)[0] || slots[index]}
              </Text>
              {session?.config.captain === team[index]?.id && (
                <Text style={s.captainMark}>CAPTAIN</Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
  const header = (kicker: string, title: string, sub?: string) => (
    <>
      <Text style={s.eyebrow}>{kicker}</Text>
      <Text style={s.heading}>{title}</Text>
      {sub && <Text style={s.body}>{sub}</Text>}
    </>
  );
  const filtered = players.filter(
    (p) =>
      (position === "ALL" || p.position === position) &&
      (eraFilter === "ALL" || p.era === eraFilter) &&
      (!onlyFavorites || saved.favorites.includes(p.id)) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const best = Math.max(0, ...saved.history.map((h) => h.result.wins));
  if (!hydrated)
    return (
      <SafeAreaView style={s.safe}>
        <BrandedLoader />
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <GoalSound
        enabled={saved.sound}
        trigger={
          screen === "match" && event?.kind === "goal"
            ? `${session?.matchIndex}-${eventIndex}`
            : ""
        }
      />
      <ScrollView
        ref={scroll}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.container}>
          <View style={s.nav}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate("home")}
            >
              <Brand size={38} wordmark />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate("settings")}
              style={s.gear}
            >
              <Text style={s.small}>SETTINGS ↗</Text>
            </Pressable>
          </View>
          {screen === "home" && (
            <>
              <View style={s.pill}>
                <Text style={s.eyebrow}>THE LEGENDS. YOUR CALL.</Text>
              </View>
              <Text style={s.hero}>
                Built by legends.{"\n"}
                <Text style={{ color: "#d6f395" }}>Managed by you.</Text>
              </Text>
              <Text style={s.body}>
                Spin through Nigeria’s football eras. Build your XI. Watch the
                action. Chase seven perfect wins.
              </Text>
              <View style={s.panel}>
                <Text style={s.section}>THE NIGERIA DUGOUT</Text>
                <TextInput
                  accessibilityLabel="Manager name"
                  style={s.input}
                  placeholder="Your manager name"
                  placeholderTextColor="#789783"
                  value={saved.managerName}
                  maxLength={24}
                  onChangeText={(managerName) =>
                    setSaved((s) => ({
                      ...s,
                      managerName: managerName.replace(/[<>]/g, ""),
                    }))
                  }
                />
                <Text style={s.small}>
                  Welcome, {saved.managerName.trim() || "Coach"}. Your name will
                  follow your next tournament.
                </Text>
              </View>
              {button(
                session && session.stage !== "result"
                  ? "Start a fresh XI  →"
                  : "Build my XI  →",
                () => start(),
              )}
              {button(
                "Online multiplayer  ↗",
                () => navigate("multiplayer"),
                true,
              )}
              <Art />
              {session &&
                button(
                  session.stage === "result"
                    ? "View last result"
                    : "Resume saved run  ↗",
                  () => {
                    setReplay(false);
                    setFrame(0);
                    setPaused(false);
                    navigate(session.stage);
                  },
                  true,
                )}
              <View style={s.row}>
                <View style={s.flex}>
                  {button(
                    "Daily challenge",
                    () => void load("daily"),
                    true,
                    busy,
                  )}
                </View>
                <View style={s.flex}>
                  {button("Leaderboard", () => void load("board"), true, busy)}
                </View>
              </View>
              <View style={s.metrics}>
                {[
                  ["64", "LEGENDS"],
                  [String(best) + "/7", "PERSONAL BEST"],
                  [String(saved.history.length), "RUNS FINISHED"],
                ].map(([value, text]) => (
                  <View key={text}>
                    <Text style={s.metric}>{value}</Text>
                    <Text style={s.small}>{text}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.section}>THE LEGENDS LOCKER</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingVertical: 14 }}
              >
                {["p61", "p9", "p17", "p62", "p33", "p25"].map((id) => {
                  const p = players.find((x) => x.id === id)!;
                  return (
                    <Pressable
                      key={id}
                      style={{ width: 132 }}
                      onPress={() => setProfile(p)}
                    >
                      <Portrait player={p} size={148} />
                      <Text
                        numberOfLines={1}
                        style={[s.cardName, { marginTop: 9 }]}
                      >
                        {p.name}
                      </Text>
                      <Text style={s.small}>
                        {p.era} · {p.rating} OVR
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {button(
                "Explore all 64 players  →",
                () => navigate("collection"),
                true,
              )}
              <View style={s.row}>
                <View style={s.flex}>
                  {button("Run history", () => navigate("history"), true)}
                </View>
                <View style={s.flex}>
                  {button(
                    "My achievements",
                    () => {
                      navigate("history");
                      setNotice(
                        "Achievement progress is below your run history.",
                      );
                    },
                    true,
                  )}
                </View>
              </View>
              <View style={s.panel}>
                <Text style={s.section}>A FRIEND SET THE CHALLENGE?</Text>
                <Text style={s.body}>
                  Paste their draft code. Same seed, same rules. Your choices
                  decide the rest.
                </Text>
                <TextInput
                  accessibilityLabel="Challenge code"
                  placeholder="E70-…"
                  placeholderTextColor="#789783"
                  value={code}
                  onChangeText={setCode}
                  maxLength={80}
                  autoCapitalize="none"
                  style={s.input}
                />
                {button(
                  "Play friend challenge",
                  () => {
                    if (/^[a-zA-Z0-9-]{5,80}$/.test(code.trim()))
                      start(null, code.trim());
                    else
                      setError(
                        "Use a 5–80 character challenge code with letters, numbers and hyphens.",
                      );
                  },
                  true,
                )}
              </View>
              {saved.tutorial && (
                <View style={s.panel}>
                  <Text style={s.section}>YOUR FIRST RUN</Text>
                  <Text style={s.body}>
                    1. Pick one player from each spin.{"\n"}2. Choose your
                    captain and approach.{"\n"}3. Earn group points, qualify,
                    then chase the cup.{"\n"}4. Share your XI and challenge a
                    friend.
                  </Text>
                  {button(
                    "Got it",
                    () => setSaved((s) => ({ ...s, tutorial: false })),
                    true,
                  )}
                </View>
              )}
              <Text style={s.foot}>
                No sign-up. Regular Play needs no server.{"\n"}Independent
                football game · no official affiliation.
              </Text>
            </>
          )}
          {screen === "draft" && session && choice && (
            <>
              {header(
                session.daily
                  ? "DAILY · " + session.daily.date
                  : "FREE PLAY · " + session.config.difficulty.toUpperCase(),
                `Find your ${slots[session.picks.length]}.`,
                "Tap a card to inspect it, then add your player.",
              )}
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${(session.picks.length / 11) * 100}%` },
                  ]}
                />
              </View>
              <View style={s.row}>
                <Text style={s.small}>{session.picks.length}/11 SIGNED</Text>
                <Text style={s.small}>FORMATION 4–3–3</Text>
              </View>
              {selectedPitch()}
              <View style={s.eraHeader}>
                <Text style={s.eyebrow}>
                  {spinning ? "TRAVELLING THROUGH TIME" : "YOUR ERA HAS LANDED"}
                </Text>
                <Text style={s.era}>
                  {spinning ? eras[spinTick % 4] : choice.era}
                </Text>
              </View>
              {spinning ? (
                <ActivityIndicator color="#d6f395" style={{ height: 230 }} />
              ) : (
                <View style={s.cardRow}>
                  {choice.players.map((p) => (
                    <Pressable
                      key={p.id}
                      style={s.draftCard}
                      onPress={() => setProfile(p)}
                      accessibilityRole="button"
                      accessibilityLabel={`Inspect ${p.name}`}
                    >
                      <Portrait player={p} size={145} />
                      <View style={s.cardBottom}>
                        <Text style={s.overall}>
                          {p.rating}
                          <Text style={s.tiny}> OVR</Text>
                        </Text>
                        <Text numberOfLines={2} style={s.cardName}>
                          {p.name}
                        </Text>
                        <Text style={s.small}>
                          {p.position} · {p.era}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
              <Text style={s.foot}>
                No duplicates. Every selection changes your squad.
              </Text>
            </>
          )}
          {screen === "ready" && session && result && (
            <>
              {header(
                "THE DRESSING ROOM",
                "Make it your team.",
                "A little chemistry. A clear plan. Eleven legends ready to go.",
              )}
              {selectedPitch()}
              <View style={s.metrics}>
                <View>
                  <Text style={s.metric}>{result.strength}</Text>
                  <Text style={s.small}>TEAM STRENGTH</Text>
                </View>
                <View>
                  <Text style={s.metric}>+{chemistry(team)}</Text>
                  <Text style={s.small}>ERA CHEMISTRY</Text>
                </View>
                <View>
                  <Text style={s.metric}>
                    {session.config.captain ? "+1" : "—"}
                  </Text>
                  <Text style={s.small}>CAPTAIN BONUS</Text>
                </View>
              </View>
              <Text style={s.section}>01 / YOUR APPROACH</Text>
              <View style={s.wrap}>
                {(["balanced", "attack", "counter"] as Tactic[]).map((t) =>
                  chip(label[t], session.config.tactic === t, () =>
                    update({ config: { ...session.config, tactic: t } }),
                  ),
                )}
              </View>
              <Text style={s.body}>
                {session.config.tactic === "attack"
                  ? "Front foot: +2 against weaker opponents, −1 against stronger sides."
                  : session.config.tactic === "counter"
                    ? "Counter attack: +2 against stronger opponents, −1 against weaker sides."
                    : "Balanced: no tactical bonus or penalty."}
              </Text>
              <Text style={s.section}>02 / THE ARMBAND</Text>
              <ScrollView
                horizontal
                contentContainerStyle={{ gap: 10, paddingVertical: 14 }}
              >
                {team.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() =>
                      update({ config: { ...session.config, captain: p.id } })
                    }
                    style={[
                      s.captainCard,
                      session.config.captain === p.id && s.selected,
                    ]}
                  >
                    <Portrait player={p} size={90} />
                    <Text numberOfLines={1} style={s.small}>
                      {p.name.split(" ").slice(-1)[0]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={s.section}>03 / THE CHALLENGE</Text>
              <View style={s.wrap}>
                {(["casual", "standard", "legend"] as Difficulty[]).map((d) =>
                  chip(d.toUpperCase(), session.config.difficulty === d, () => {
                    if (!session.daily)
                      update({ config: { ...session.config, difficulty: d } });
                  }),
                )}
              </View>
              <Text style={s.body}>
                {session.daily
                  ? "Daily mode is locked to Standard for everyone."
                  : "Casual: opponents −7. Standard: original ratings. Legend: opponents +6."}{" "}
                Chemistry adds up to +3 for adjacent draft slots sharing an era.
              </Text>
              {button(
                "Tournament hub & match preview",
                () => navigate("tournament"),
                true,
              )}
              {button("Kick off  →", () => {
                setReplay(false);
                kickoff();
              })}
              {button("Share draft challenge code", shareCode, true)}
            </>
          )}
          {screen === "match" && session && match && event && result && (
            <>
              {header(
                replay ? "HIGHLIGHTS REPLAY" : match.stage.toUpperCase(),
                "The perfect run.",
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
              >
                {opponents.map(([stage], i) => (
                  <View
                    key={stage}
                    style={[s.round, i === session.matchIndex && s.roundActive]}
                  >
                    <Text style={s.small}>
                      {i < 3
                        ? "G" + (i + 1)
                        : ["R16", "QF", "SF", "FINAL"][i - 3]}
                    </Text>
                    <Text style={s.roundStatus}>
                      {i < session.matchIndex
                        ? result.matches[i]?.won
                          ? "W"
                          : result.matches[i]?.home === result.matches[i]?.away
                            ? "D"
                            : "L"
                        : i === session.matchIndex
                          ? "●"
                          : "·"}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              {button(
                "Match centre · lineups & tournament",
                () => {
                  setPaused(true);
                  navigate("tournament");
                },
                true,
              )}
              <View style={s.scoreboard}>
                <View style={s.flex}>
                  <Text style={s.teamLabel}>NIGERIA</Text>
                  <Text style={s.small}>
                    {session.managerName || "Coach"} ·{" "}
                    {label[session.config.tactic]}
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={s.score}>
                    {event.home} : {event.away}
                  </Text>
                  <Text style={s.minute}>
                    {complete
                      ? "FULL TIME"
                      : `${event.minute}′ ${paused ? "PAUSED" : "LIVE"}`}
                  </Text>
                </View>
                <View style={[s.flex, { alignItems: "flex-end" }]}>
                  <Text style={s.teamLabel}>
                    {match.opponent.toUpperCase()}
                  </Text>
                  <Text style={s.small}>OPPOSITION</Text>
                </View>
              </View>
              <Pitch
                team={team}
                event={event}
                previous={match.events[Math.max(0, eventIndex - 1)]}
                progress={
                  complete
                    ? 1
                    : Math.min(
                        1,
                        (frame - (timeline[eventIndex]?.start || 0)) /
                          Math.max(
                            1,
                            (timeline[eventIndex]?.end || 1) -
                              (timeline[eventIndex]?.start || 0),
                          ),
                      )
                }
                reduceMotion={reduce}
              />
              <View style={s.commentary}>
                <Text style={s.eyebrow}>
                  {event.kind === "goal" ? "GOAL ALERT" : "MATCH FEED"} ·{" "}
                  {event.minute}′
                </Text>
                <Text style={s.commentText}>{event.text}</Text>
              </View>
              <View style={s.row}>
                {button(
                  paused ? "▶ Resume" : "Ⅱ Pause",
                  () => setPaused((x) => !x),
                  true,
                  complete,
                )}
                <View style={s.wrap}>
                  {[0.5, 1, 2, 4].map((v) =>
                    chip(v + "×", speed === v, () => setSpeed(v)),
                  )}
                </View>
              </View>
              <View style={s.panel}>
                <Text style={s.section}>
                  {complete ? "MATCH STATS" : "MATCH STATS · SO FAR"}
                </Text>
                <View style={s.statRow}>
                  <Text style={s.metric}>{match.possession}%</Text>
                  <Text style={s.small}>MODELLED POSSESSION</Text>
                  <Text style={s.metric}>{100 - match.possession}%</Text>
                </View>
                <View style={s.statRow}>
                  <Text style={s.metric}>
                    {
                      match.events
                        .slice(0, eventIndex + 1)
                        .filter((e) => e.side === "home" && e.kind === "shot")
                        .length
                    }
                  </Text>
                  <Text style={s.small}>SHOTS</Text>
                  <Text style={s.metric}>
                    {
                      match.events
                        .slice(0, eventIndex + 1)
                        .filter((e) => e.side === "away" && e.kind === "shot")
                        .length
                    }
                  </Text>
                </View>
              </View>
              {complete ? (
                button(
                  replay
                    ? "Back to result"
                    : session.matchIndex < result.matches.length - 1
                      ? "Next match  →"
                      : "See my result  →",
                  () => {
                    if (
                      !replay &&
                      session.matchIndex < result.matches.length - 1
                    )
                      kickoff(session.matchIndex + 1);
                    else finish();
                  },
                )
              ) : (
                <Text style={s.foot}>
                  Condensed highlights · passes, carries, shots and keeper
                  actions.
                </Text>
              )}
              {complete &&
                button(
                  "Replay this match",
                  () => {
                    setFrame(0);
                    setPaused(false);
                  },
                  true,
                )}
            </>
          )}
          {screen === "result" && session && result && (
            <>
              <View ref={card} collapsable={false} style={s.resultCard}>
                <Text style={s.eyebrow}>
                  EAGLES 7–0 ·{" "}
                  {session.daily ? "DAILY CHALLENGE" : "MY LEGENDS XI"}
                </Text>
                <Text style={s.small}>
                  NIGERIA MANAGER · {session.managerName || "Coach"}
                </Text>
                <Text style={s.bigScore}>
                  {result.wins}
                  <Text style={s.denominator}> / 7</Text>
                </Text>
                <Text style={s.heading}>{result.title}</Text>
                <Text style={s.body}>
                  {result.strength} strength · {label[session.config.tactic]} ·{" "}
                  {session.config.difficulty}
                </Text>
                {selectedPitch()}
                <View style={s.wrap}>
                  {result.matches.map((m, i) => (
                    <View key={i} style={s.scorePill}>
                      <Text style={s.small}>
                        {m.opponent} {m.home}–{m.away}{" "}
                        {m.penalties
                          ? ` (pens ${m.penalties.home}–${m.penalties.away})`
                          : ""}{" "}
                        {m.won ? "✓" : "×"}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={s.foot}>
                  DRAFT THE LEGENDS. CHASE THE PERFECT RUN.
                </Text>
              </View>
              {button(
                sharing ? "Creating image…" : "Share my XI  ↗",
                () => {
                  setSharing(true);
                  setError("");
                  void shareCard(card)
                    .catch((e) => {
                      if (e.name !== "AbortError") setError(e.message);
                    })
                    .finally(() => setSharing(false));
                },
                false,
                sharing,
              )}
              {button("Challenge a friend", shareCode, true)}
              <Text style={[s.section, { marginTop: 22 }]}>RELIVE THE RUN</Text>
              <View style={s.wrap}>
                {result.matches.map((m, i) =>
                  chip(m.stage, false, () => {
                    setReplay(true);
                    kickoff(i);
                  }),
                )}
              </View>
              {session.daily && !submitted && (
                <View style={s.panel}>
                  <Text style={s.section}>LEAVE YOUR NAME ON THE BOARD</Text>
                  <TextInput
                    accessibilityLabel="Leaderboard name"
                    placeholder="Your name"
                    placeholderTextColor="#789783"
                    style={s.input}
                    value={name}
                    onChangeText={setName}
                    maxLength={24}
                  />
                  {button(
                    "Submit daily score",
                    () => void submit(),
                    true,
                    busy || name.trim().length < 2,
                  )}
                </View>
              )}
              {!session.daily &&
                button(
                  "Play again with this XI  ↻",
                  () => {
                    const id = Date.now().toString() + Math.random();
                    update({
                      id,
                      matchSeed: id,
                      stage: "ready",
                      matchIndex: 0,
                    });
                    setReplay(false);
                    setSubmitted(false);
                    navigate("ready");
                  },
                  true,
                )}
              {session.daily && (
                <Text style={s.foot}>
                  Daily results stay fixed for fair comparison. Free Play
                  rematches can change.
                </Text>
              )}
              {button(
                "Tournament · scorers · assists",
                () => navigate("tournament"),
                true,
              )}
              {button("Build another XI  →", () => start())}
            </>
          )}
          {screen === "tournament" && session && result && (
            <>
              {button(
                session.stage === "ready"
                  ? "Back to dressing room"
                  : session.stage === "result"
                    ? "Back to result"
                    : "Back to match",
                () => navigate(session.stage),
              )}
              <TournamentHub
                result={result}
                onRecover={() => {
                  setSimulationRevision((n) => n + 1);
                  update({ stage: "ready", matchIndex: 0 });
                  setFrame(0);
                  setReplay(false);
                  navigate("ready");
                  setNotice(
                    "Your XI has been kept. The tournament is ready to restart.",
                  );
                }}
                team={team}
                manager={session.managerName || saved.managerName || "Coach"}
                matchIndex={
                  session.stage === "result"
                    ? result.matches.length - 1
                    : session.matchIndex
                }
                completed={session.stage === "result" || complete}
                finished={session.stage === "result"}
                live={
                  session.stage === "match" && !complete && event
                    ? {
                        home: event.home,
                        away: event.away,
                        minute: event.minute,
                      }
                    : undefined
                }
              />
            </>
          )}
          {screen === "multiplayer" && (
            <>
              {button("Back to home", () => navigate("home"), true)}
              <Multiplayer manager={saved.managerName} />
            </>
          )}
          {screen === "collection" && (
            <>
              {header(
                "THE LEGENDS LOCKER",
                "A nation of talent.",
                "Explore the pool. Inspect player cards. Save your favourites.",
              )}
              <TextInput
                accessibilityLabel="Search players"
                value={search}
                onChangeText={setSearch}
                placeholder="Search a legend…"
                placeholderTextColor="#789783"
                style={s.input}
              />
              <View style={s.wrap}>
                {["ALL", "GK", "DEF", "MID", "FWD"].map((p) =>
                  chip(p, p === position, () => setPosition(p)),
                )}
              </View>
              <ScrollView
                horizontal
                contentContainerStyle={{ gap: 8, paddingVertical: 10 }}
              >
                {["ALL", ...eras].map((e) =>
                  chip(e, eraFilter === e, () => setEraFilter(e)),
                )}
              </ScrollView>
              {chip("★ Favourites", onlyFavorites, () =>
                setOnlyFavorites((x) => !x),
              )}
              <Text style={[s.small, { marginVertical: 16 }]}>
                {filtered.length} PLAYERS · SUBJECTIVE GAME RATINGS
              </Text>
              <View style={s.collection}>
                {filtered.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setProfile(p)}
                    style={s.collectionCard}
                  >
                    <Portrait player={p} size={155} />
                    <View style={s.cardBottom}>
                      <View style={s.row}>
                        <Text style={s.overall}>{p.rating}</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Favourite ${p.name}`}
                          onPress={(e) => {
                            e.stopPropagation();
                            favorite(p.id);
                          }}
                        >
                          <Text style={{ fontSize: 24, color: "#d6f395" }}>
                            {saved.favorites.includes(p.id) ? "★" : "☆"}
                          </Text>
                        </Pressable>
                      </View>
                      <Text style={s.cardName}>{p.name}</Text>
                      <Text style={s.small}>
                        {p.position} · {p.era}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
              {!filtered.length && (
                <Text style={s.body}>No players match these filters.</Text>
              )}
            </>
          )}
          {screen === "history" && (
            <>
              {header(
                "YOUR FOOTBALL STORY",
                "Make a little history.",
                `${saved.history.length} runs saved on this device · best ${best}/7`,
              )}
              {!saved.history.length && (
                <Text style={s.body}>Finish a run to start your story.</Text>
              )}
              {saved.history.map((h) => (
                <Pressable
                  key={h.id}
                  style={s.history}
                  onPress={() => {
                    setSaved((s) => ({
                      ...s,
                      session: {
                        id: h.id,
                        seed: h.seed,
                        matchSeed: h.matchSeed,
                        managerName: h.managerName,
                        picks: h.picks,
                        config: h.config,
                        stage: "result",
                        daily: null,
                        matchIndex: 0,
                      },
                    }));
                    setReplay(true);
                    navigate("result");
                  }}
                >
                  <View style={s.flex}>
                    <Text style={s.cardName}>{h.result.title}</Text>
                    <Text style={s.small}>
                      {new Date(h.at).toLocaleDateString()} ·{" "}
                      {h.config.difficulty} · {h.daily ? "DAILY" : "FREE PLAY"}
                    </Text>
                  </View>
                  <Text style={s.overall}>{h.result.wins}/7 ↗</Text>
                </Pressable>
              ))}
              <Text style={[s.section, { marginVertical: 20 }]}>
                THE TROPHY CABINET
              </Text>
              {badges.map((b) => (
                <View
                  key={b.id}
                  style={[
                    s.achievement,
                    !b.test(saved.history) && { opacity: 0.45 },
                  ]}
                >
                  <Text style={s.badgeIcon}>
                    {b.test(saved.history) ? "★" : "○"}
                  </Text>
                  <View style={s.flex}>
                    <Text style={s.cardName}>{b.title}</Text>
                    <Text style={s.small}>{b.text}</Text>
                  </View>
                  <Text style={s.small}>
                    {b.test(saved.history) ? "EARNED" : "LOCKED"}
                  </Text>
                </View>
              ))}
            </>
          )}
          {screen === "board" && (
            <>
              {header(
                "DAILY LEADERBOARD · " + dailyBoard?.date,
                "The ones to beat.",
                "Most wins, then team strength. One score per network per UTC day.",
              )}
              {!board.length && (
                <Text style={s.body}>
                  A fresh pitch. Be the first to set a score.
                </Text>
              )}
              {board.map((v, i) => (
                <View key={v._id} style={s.history}>
                  <Text style={s.overall}>
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                  <View style={s.flex}>
                    <Text style={s.cardName}>{v.playerName}</Text>
                    <Text style={s.small}>{v.strength} STRENGTH</Text>
                  </View>
                  <Text style={s.overall}>{v.matchesWon}/7</Text>
                </View>
              ))}
              {button(
                "Play today’s challenge",
                () => dailyBoard && start(dailyBoard),
              )}
            </>
          )}
          {screen === "settings" && (
            <>
              {header(
                "MAKE YOURSELF AT HOME",
                "Your matchday.",
                "Settings are saved on this device. Sound starts off and plays only for goals.",
              )}
              <View style={s.setting}>
                <Text style={s.cardName}>Goal sound</Text>
                <Switch
                  accessibilityLabel="Goal sound"
                  value={saved.sound}
                  onValueChange={(sound) => setSaved((s) => ({ ...s, sound }))}
                  trackColor={{ true: "#91b961" }}
                />
              </View>
              <View style={s.setting}>
                <Text style={s.cardName}>Haptics (native)</Text>
                <Switch
                  accessibilityLabel="Haptics"
                  value={saved.haptics}
                  onValueChange={(haptics) =>
                    setSaved((s) => ({ ...s, haptics }))
                  }
                />
              </View>
              <Text style={s.body}>
                Reduced motion follows your device accessibility preference.
                Pause and speed controls are available during every match.
                Leaving a match saves the match index; resuming restarts its
                presentation.
              </Text>
              {button(
                "Show first-run guide again",
                () => {
                  setSaved((s) => ({ ...s, tutorial: true }));
                  navigate("home");
                },
                true,
              )}
              <Text style={s.section}>PHOTO CREDITS</Text>
              <Text style={s.body}>
                Bundled Wikimedia Commons thumbnails. Photographers retain their
                rights; no endorsement is implied. Cards crop the original
                image. Missing photos use an original silhouette.
              </Text>
              {Object.entries(credits)
                .filter(([, c]) => "file" in c)
                .map(([id, c]) => (
                  <Pressable
                    key={id}
                    style={s.creditRow}
                    onPress={() =>
                      "source" in c && void Linking.openURL(c.source)
                    }
                  >
                    <Text style={s.cardName}>{c.name} ↗</Text>
                    <Text style={s.small}>
                      {"author" in c ? c.author : ""} ·{" "}
                      {"license" in c ? c.license : ""}
                    </Text>
                    {"licenseUrl" in c && !!c.licenseUrl && (
                      <Text
                        style={s.link}
                        onPress={() => void Linking.openURL(c.licenseUrl)}
                      >
                        View licence ↗
                      </Text>
                    )}
                  </Pressable>
                ))}
              <Text style={s.foot}>
                Independent prototype. Ratings and positions are simplified game
                choices. The animated pitch illustrates a probability model, not
                a live football feed.
              </Text>
            </>
          )}
          {busy && (
            <View style={s.feedback}>
              <ActivityIndicator color="#d6f395" />
              <Text style={s.feedbackText}>
                {slow
                  ? "Waking up the server… Regular Play stays ready."
                  : "Connecting…"}
              </Text>
            </View>
          )}
          {!!error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
          {!!notice && (
            <Text selectable style={s.notice}>
              {notice}
            </Text>
          )}
          <Text style={s.footer}>FOR THE LOVE OF NIGERIAN FOOTBALL</Text>
        </View>
      </ScrollView>
      <Modal
        transparent
        visible={!!profile}
        animationType={reduce ? "none" : "slide"}
        onRequestClose={() => setProfile(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modal}>
            <ScrollView>
              {profile && (
                <>
                  <Portrait player={profile} size={230} />
                  <View style={s.row}>
                    <Text style={s.heading}>{profile.name}</Text>
                    <Text style={s.overall}>{profile.rating}</Text>
                  </View>
                  <Text style={s.body}>
                    {profile.position} · {profile.era} · Subjective game rating
                  </Text>
                  <View style={s.wrap}>
                    {chip(
                      saved.favorites.includes(profile.id)
                        ? "★ Saved favourite"
                        : "☆ Save favourite",
                      saved.favorites.includes(profile.id),
                      () => favorite(profile.id),
                    )}
                  </View>
                  <Text style={s.body}>
                    Era link: +1 chemistry for each two adjacent same-era
                    connections, capped at +3. Choose a captain before kick-off
                    for another +1.
                  </Text>
                  {screen === "draft" &&
                    choice?.players.some((p) => p.id === profile.id) &&
                    button("Sign " + profile.name, () => pick(profile))}
                  {button("Close player card", () => setProfile(null), true)}
                  {(() => {
                    const c = credits[profile.id as keyof typeof credits];
                    return c && "source" in c ? (
                      <View>
                        <Text style={s.small}>
                          PHOTO: {"author" in c ? c.author : ""} ·{" "}
                          {"license" in c ? c.license : ""} · Cropped for
                          display.
                        </Text>
                        <Text
                          style={s.link}
                          onPress={() => void Linking.openURL(c.source)}
                        >
                          Source / attribution ↗
                        </Text>
                        {"licenseUrl" in c && !!c.licenseUrl && (
                          <Text
                            style={s.link}
                            onPress={() => void Linking.openURL(c.licenseUrl)}
                          >
                            Licence ↗
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={s.small}>
                        No suitable bundled photograph available.
                      </Text>
                    );
                  })()}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create(
  playful({
    safe: { flex: 1, backgroundColor: "#071e19" },
    scroll: { flexGrow: 1 },
    container: {
      width: "100%",
      maxWidth: 680,
      alignSelf: "center",
      paddingHorizontal: 20,
      paddingBottom: 28,
    },
    nav: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 23,
      marginBottom: 18,
    },
    brand: {
      fontWeight: "900",
      fontSize: 23,
      color: "#f1f3e5",
      letterSpacing: -1,
    },
    gear: { padding: 9, backgroundColor: "#13382b", borderRadius: 20 },
    eyebrow: {
      fontSize: 10,
      letterSpacing: 1.8,
      fontWeight: "800",
      color: "#b9d595",
    },
    small: {
      fontSize: 9,
      lineHeight: 14,
      letterSpacing: 0.5,
      color: "#9eb6a0",
    },
    tiny: { fontSize: 8, color: "#9eb6a0" },
    pill: {
      borderWidth: 1,
      borderColor: "#31533c",
      borderRadius: 20,
      padding: 10,
      alignSelf: "flex-start",
    },
    hero: {
      fontSize: 44,
      lineHeight: 48,
      letterSpacing: -2,
      fontWeight: "900",
      color: "#f3f1df",
      marginTop: 22,
    },
    heading: {
      fontSize: 30,
      lineHeight: 35,
      letterSpacing: -0.8,
      fontWeight: "900",
      color: "#f3f1df",
      marginTop: 12,
      flexShrink: 1,
    },
    body: {
      fontSize: 14,
      lineHeight: 23,
      color: "#a6bca6",
      marginTop: 12,
      marginBottom: 20,
    },
    button: {
      paddingVertical: 17,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: "#d6f395",
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 6,
    },
    secondary: { backgroundColor: "#163c2d" },
    buttonText: { fontSize: 13, fontWeight: "800", color: "#123529" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    flex: { flex: 1 },
    wrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginVertical: 12,
    },
    chip: {
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: "#173d2e",
    },
    chipActive: { backgroundColor: "#d6f395" },
    chipText: { fontSize: 11, color: "#d7e5cc", fontWeight: "700" },
    metrics: {
      flexDirection: "row",
      justifyContent: "space-around",
      backgroundColor: "#103126",
      borderRadius: 16,
      padding: 18,
      marginVertical: 22,
    },
    metric: { fontWeight: "900", fontSize: 24, color: "#e4efcf" },
    section: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.3,
      color: "#e3ecd0",
      marginTop: 10,
    },
    panel: {
      padding: 18,
      borderRadius: 18,
      backgroundColor: "#103427",
      marginVertical: 14,
    },
    input: {
      color: "#edf3dd",
      backgroundColor: "#09271e",
      borderWidth: 1,
      borderColor: "#2b4c35",
      padding: 15,
      borderRadius: 12,
      fontSize: 15,
      marginVertical: 10,
    },
    cardRow: { flexDirection: "row", gap: 8, marginTop: 14 },
    draftCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: "#163d2b",
      borderRadius: 14,
      overflow: "hidden",
    },
    cardBottom: { padding: 10, gap: 6 },
    cardName: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      color: "#eef2df",
    },
    overall: { fontSize: 25, fontWeight: "900", color: "#d6f395" },
    teamPitch: {
      backgroundColor: "#164833",
      borderRadius: 18,
      paddingVertical: 18,
      paddingHorizontal: 7,
      marginVertical: 18,
      borderWidth: 1,
      borderColor: "#346043",
    },
    formationRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginVertical: 9,
    },
    teamPlayer: { alignItems: "center", width: "24%" },
    numberDisc: {
      width: 33,
      height: 33,
      borderRadius: 17,
      backgroundColor: "#62866b",
      alignItems: "center",
      justifyContent: "center",
    },
    discText: { fontSize: 12, fontWeight: "900", color: "#143821" },
    playerName: {
      fontSize: 10,
      color: "#e4efcf",
      marginTop: 5,
      maxWidth: "100%",
    },
    captainMark: { fontSize: 6, color: "#d6f395", marginTop: 2 },
    progressTrack: {
      height: 4,
      backgroundColor: "#244d33",
      borderRadius: 3,
      overflow: "hidden",
      marginBottom: 10,
    },
    progressFill: { height: 4, backgroundColor: "#d6f395" },
    eraHeader: { alignItems: "center", padding: 10 },
    era: {
      fontSize: 38,
      color: "#d6f395",
      fontWeight: "900",
      letterSpacing: -1,
      marginTop: 8,
    },
    captainCard: {
      width: 85,
      padding: 5,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: "transparent",
    },
    selected: { borderColor: "#d6f395" },
    round: {
      minWidth: 45,
      borderRadius: 10,
      padding: 10,
      backgroundColor: "#123527",
      alignItems: "center",
    },
    roundActive: { borderWidth: 1, borderColor: "#d6f395" },
    roundStatus: { color: "#d6f395", marginTop: 4 },
    scoreboard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 10,
    },
    score: {
      fontWeight: "900",
      fontSize: 43,
      color: "#eff5df",
      letterSpacing: -2,
    },
    teamLabel: { fontWeight: "800", fontSize: 11, color: "#ecf3dd" },
    minute: {
      fontSize: 9,
      color: "#d6f395",
      fontWeight: "800",
      letterSpacing: 1,
    },
    commentary: {
      minHeight: 92,
      backgroundColor: "#153c2b",
      borderRadius: 14,
      padding: 16,
    },
    commentText: {
      fontSize: 16,
      lineHeight: 24,
      color: "#edf3db",
      fontWeight: "700",
      marginTop: 8,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 20,
    },
    resultCard: { backgroundColor: "#0b2d23", padding: 18, borderRadius: 20 },
    bigScore: {
      fontSize: 100,
      fontWeight: "900",
      letterSpacing: -5,
      color: "#d6f395",
      marginTop: 12,
    },
    denominator: { fontSize: 30, color: "#7c9a7d", letterSpacing: -1 },
    scorePill: { padding: 7, backgroundColor: "#1b432e", borderRadius: 8 },
    collection: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    collectionCard: {
      width: "47.5%",
      backgroundColor: "#163c2b",
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 8,
    },
    history: {
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
      padding: 17,
      borderRadius: 14,
      backgroundColor: "#143b2b",
      marginVertical: 6,
    },
    achievement: {
      flexDirection: "row",
      gap: 14,
      alignItems: "center",
      backgroundColor: "#123627",
      padding: 16,
      borderRadius: 14,
      marginVertical: 5,
    },
    badgeIcon: { fontSize: 26, color: "#d6f395" },
    setting: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 16,
    },
    creditRow: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderColor: "#244c33",
    },
    link: {
      fontSize: 12,
      color: "#d6f395",
      marginVertical: 8,
      textDecorationLine: "underline",
    },
    foot: {
      fontSize: 10,
      lineHeight: 18,
      color: "#91ac91",
      textAlign: "center",
      marginVertical: 20,
    },
    footer: {
      fontSize: 8,
      letterSpacing: 1.3,
      color: "#618168",
      textAlign: "center",
      marginTop: 28,
    },
    feedback: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      padding: 14,
    },
    feedbackText: { color: "#d6f395", fontSize: 13, flex: 1 },
    error: { color: "#ffb39a", fontSize: 13, lineHeight: 22, marginTop: 15 },
    notice: { color: "#d6f395", fontSize: 13, lineHeight: 22, marginTop: 15 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "#000b",
      justifyContent: "center",
      padding: 20,
    },
    modal: {
      width: "100%",
      maxWidth: 450,
      maxHeight: "90%",
      alignSelf: "center",
      backgroundColor: "#103426",
      borderRadius: 24,
      padding: 22,
    },
  }),
);
