import { tournamentState } from "./tournamentState";
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";
import {
  groups,
  table,
  playerLeaders,
  countryByName,
  ratings,
  type Fixture,
} from "../../shared/worldcup";
import type { Result, Player } from "../../shared/game";
type Props = {
  result: Result;
  onRecover: () => void;
  team: Player[];
  manager: string;
  matchIndex: number;
  completed: boolean;
  finished: boolean;
  live?: { home: number; away: number; minute: number };
};
export default function TournamentHub({
  result,
  onRecover,
  team,
  manager,
  matchIndex,
  completed,
  finished,
  live,
}: Props) {
  const [tab, setTab] = useState("Overview"),
    [detail, setDetail] = useState<Fixture | null>(null),
    [all, setAll] = useState(false);
  const state = tournamentState(result, matchIndex);
  if (!state)
    return (
      <View style={s.panel}>
        <Text accessibilityRole="alert" style={s.heading}>
          Let’s rebuild your tournament.
        </Text>
        <Text style={s.body}>
          This match data is from an older or incomplete run. Your drafted XI is
          safe. Rebuild the tournament to continue.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRecover}
          style={s.chip}
        >
          <Text style={s.chipText}>Rebuild tournament</Text>
        </Pressable>
      </View>
    );
  const { cup, own } = state;
  const cutoff = all ? Infinity : own.id - (completed ? 0 : 1),
    visible = cup.fixtures.filter((f) => f.id <= cutoff),
    leaders = playerLeaders(visible);
  const button = (text: string, fn: () => void, active = false) => (
    <Pressable
      key={text}
      accessibilityRole="button"
      onPress={fn}
      style={[s.chip, active && { backgroundColor: "#d6f395" }]}
    >
      <Text style={[s.chipText, active && { color: "#153d28" }]}>{text}</Text>
    </Pressable>
  );
  const managerOf = (name: string) =>
    name === "Nigeria" ? manager : countryByName(name).manager;
  const lineup = (name: string) =>
    name === "Nigeria"
      ? team.map((p) => ({ name: p.name, position: p.position }))
      : countryByName(name).xi;
  const score = (f: Fixture) =>
    `${f.home} – ${f.away}${f.penalties ? ` (p ${f.penalties.home}–${f.penalties.away})` : ""}`;
  return (
    <View>
      <Text style={s.kicker}>CLASSIC 32 · FANTASY WORLD CUP</Text>
      <Text style={s.heading}>The world is watching.</Text>
      <Text style={s.body}>
        Eight groups. Top two qualify. Four knockout rounds. Nigeria take the
        place of Qatar in a historical 2022 field.
      </Text>
      <Text style={s.manager}>NIGERIA MANAGER · {manager}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 18 }}
      >
        {["Overview", "Groups", "Knockouts", "Scorers", "Assists"].map((t) =>
          button(t, () => setTab(t), tab === t),
        )}
      </ScrollView>
      {tab === "Overview" && (
        <>
          <View style={s.panel}>
            <Text style={s.kicker}>
              {live
                ? "LIVE · PAUSED"
                : completed
                  ? "LAST NIGERIA MATCH"
                  : "MATCH PREVIEW"}{" "}
              · {own.stage}
            </Text>
            <Text style={s.heading}>Nigeria vs {own.awayTeam}</Text>
            <Text style={s.body}>
              {manager} vs {managerOf(own.awayTeam)}
            </Text>
            {button("Open match centre", () => setDetail(own))}
          </View>
          <View style={s.flow}>
            {[
              "32 teams",
              "8 groups",
              "16 qualify",
              "8 → 4 → 2",
              "1 champion",
            ].map((v, i) => (
              <View key={v} style={s.flowItem}>
                <Text style={s.step}>{i + 1}</Text>
                <Text style={s.small}>{v}</Text>
              </View>
            ))}
          </View>
          <Text style={s.section}>MATCHDAY FEED</Text>
          {cup.fixtures
            .filter(
              (f) => f.group !== undefined && f.id <= Math.max(cutoff, own.id),
            )
            .map((f) => (
              <Pressable
                key={f.id}
                style={s.fixture}
                onPress={() => setDetail(f)}
              >
                <Text style={s.small}>
                  {f.stage} · {String.fromCharCode(65 + f.group!)}
                </Text>
                <Text style={s.name}>
                  {f.homeTeam} vs {f.awayTeam}
                </Text>
                <Text style={s.score}>
                  {f.id <= cutoff ? score(f) : "UPCOMING"} ↗
                </Text>
              </Pressable>
            ))}
        </>
      )}
      {tab === "Groups" &&
        groups.map((names, g) => (
          <View style={s.panel} key={g}>
            <Text style={s.section}>GROUP {String.fromCharCode(65 + g)}</Text>
            <View style={s.tableRow}>
              <Text style={s.country}>NATION</Text>
              <Text style={s.cell}>P</Text>
              <Text style={s.cell}>GD</Text>
              <Text style={s.cell}>PTS</Text>
            </View>
            {table(
              names,
              visible.filter((f) => f.group === g),
            ).map((row, i) => (
              <View
                key={row.team}
                style={[s.tableRow, i < 2 && { backgroundColor: "#244f34" }]}
              >
                <Text style={s.country}>
                  {i + 1}. {row.team}
                </Text>
                <Text style={s.cell}>{row.played}</Text>
                <Text style={s.cell}>{row.gf - row.ga}</Text>
                <Text style={s.cell}>{row.points}</Text>
              </View>
            ))}
          </View>
        ))}
      {tab === "Knockouts" &&
        ["Round of 16", "Quarter-final", "Semi-final", "Final"].map((stage) => (
          <View key={stage}>
            <Text style={s.section}>{stage.toUpperCase()}</Text>
            {cup.fixtures
              .filter((f) => f.stage === stage)
              .map((f) => {
                const known =
                  all ||
                  (f.id <= Math.max(cutoff, own.id) && own.group === undefined);
                return (
                  <Pressable
                    key={f.id}
                    disabled={!known}
                    style={s.fixture}
                    onPress={() => setDetail(f)}
                  >
                    <Text style={s.name}>
                      {known
                        ? `${f.homeTeam} vs ${f.awayTeam}`
                        : "Qualifiers to be confirmed"}
                    </Text>
                    <Text style={s.score}>
                      {f.id <= cutoff ? score(f) : "UPCOMING"}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
        ))}
      {(tab === "Scorers" || tab === "Assists") && (
        <>
          <Text style={s.section}>
            {tab === "Scorers" ? "THE GOLDEN BOOT RACE" : "THE CREATORS’ CLUB"}
          </Text>
          <Text style={s.body}>
            Completed tournament fixtures only. No future goals are revealed.
          </Text>
          {(tab === "Scorers" ? leaders.scorers : leaders.assisters)
            .slice(0, 30)
            .map((p, i) => (
              <View key={p.id} style={s.leader}>
                <Text style={s.rank}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{p.name}</Text>
                  <Text style={s.small}>
                    {p.country} · {p.goals} goals · {p.assists} assists
                  </Text>
                </View>
                <Text style={s.score}>
                  {tab === "Scorers" ? p.goals : p.assists}
                </Text>
              </View>
            ))}
          {!leaders.scorers.length && (
            <Text style={s.body}>The first goals will start the race.</Text>
          )}
        </>
      )}
      {finished &&
        !all &&
        button("Simulate the rest of the tournament", () => setAll(true))}
      {all && (
        <Text style={s.manager}>
          SIMULATED CHAMPIONS · {cup.champion.toUpperCase()}
        </Text>
      )}
      <Text style={s.body}>
        Historical managers and squads; game-selected starting XIs. Ratings,
        previews, venues and results are fictional. Group ties: points, goal
        difference, goals scored, then alphabetical order (simplified).
      </Text>
      <Modal
        visible={!!detail}
        transparent
        animationType="slide"
        onRequestClose={() => setDetail(null)}
      >
        <View style={s.backdrop}>
          <View style={s.modal}>
            <ScrollView>
              {detail && (
                <>
                  <Text style={s.kicker}>
                    THE MATCH CENTRE · {detail.stage}
                  </Text>
                  <Text style={s.heading}>
                    {detail.homeTeam} vs {detail.awayTeam}
                  </Text>
                  <Text style={s.big}>
                    {detail.id <= cutoff
                      ? score(detail)
                      : live && detail.id === own.id
                        ? `${live.home} – ${live.away} · ${live.minute}′ PAUSED`
                        : "PRE-MATCH"}
                  </Text>
                  <View style={s.panel}>
                    <Text style={s.section}>MATCH INFO</Text>
                    <Text style={s.body}>
                      Neutral venue · Legends Arena {(detail.id % 4) + 1}
                      {"\n"}
                      {detail.group !== undefined
                        ? `Group ${String.fromCharCode(65 + detail.group)} · 3 points for a win`
                        : "Knockout · level scores use a deciding shoot-out"}
                      {"\n"}Pitch: good · Conditions: clear (simulated){"\n"}
                      {managerOf(detail.homeTeam)} vs{" "}
                      {managerOf(detail.awayTeam)}
                    </Text>
                  </View>
                  {detail.id > cutoff && !(live && detail.id === own.id) && (
                    <View style={s.panel}>
                      <Text style={s.section}>
                        PUNDIT’S CORNER · SIMULATED PREVIEW
                      </Text>
                      <Text style={s.body}>
                        {(detail.homeTeam === "Nigeria"
                          ? result.strength
                          : ratings[detail.homeTeam]) >
                        (detail.awayTeam === "Nigeria"
                          ? result.strength
                          : ratings[detail.awayTeam])
                          ? detail.homeTeam
                          : detail.awayTeam}{" "}
                        have the rating edge. Watch the midfield battle and runs
                        behind the defence. An early goal could change the
                        story. This is fictional analysis, not reporting or
                        betting advice.
                      </Text>
                    </View>
                  )}
                  {[detail.homeTeam, detail.awayTeam].map((nation) => (
                    <View key={nation} style={s.panel}>
                      <Text style={s.section}>
                        {nation.toUpperCase()} · GAME XI
                      </Text>
                      <Text style={s.body}>Manager: {managerOf(nation)}</Text>
                      {lineup(nation).map((p, i) => (
                        <View key={p.name} style={s.tableRow}>
                          <Text style={s.cell}>{i + 1}</Text>
                          <Text style={s.country}>{p.name}</Text>
                          <Text style={s.cell}>{p.position}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                  {detail.id <= cutoff && (
                    <View style={s.panel}>
                      <Text style={s.section}>GOALS & ASSISTS</Text>
                      {detail.goals.map((g, i) => (
                        <View key={i} style={{ paddingVertical: 10 }}>
                          <Text style={s.name}>
                            {g.minute}′ · {g.scorer}
                          </Text>
                          <Text style={s.small}>
                            {g.side === "home"
                              ? detail.homeTeam
                              : detail.awayTeam}
                            {g.assist
                              ? ` · Assist: ${g.assist}`
                              : " · Unassisted"}
                          </Text>
                        </View>
                      ))}
                      {!detail.goals.length && (
                        <Text style={s.body}>No goals in regulation.</Text>
                      )}
                    </View>
                  )}
                  {detail.id <= cutoff && detail.nigeriaIndex !== undefined && (
                    <View style={s.panel}>
                      <Text style={s.section}>NIGERIA MATCH STATS</Text>
                      <Text style={s.body}>
                        Shots: {result.matches[detail.nigeriaIndex].homeShots} –{" "}
                        {result.matches[detail.nigeriaIndex].awayShots}
                        {"\n"}Possession:{" "}
                        {result.matches[detail.nigeriaIndex].possession}% –{" "}
                        {100 - result.matches[detail.nigeriaIndex].possession}%
                      </Text>
                      <Text style={s.section}>COMMENTARY TRANSCRIPT</Text>
                      {result.matches[detail.nigeriaIndex].events.map(
                        (e, i) => (
                          <Text key={i} style={s.body}>
                            {e.minute}′ · {e.text}
                          </Text>
                        ),
                      )}
                    </View>
                  )}
                  {button("Close match centre", () => setDetail(null))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  kicker: {
    fontFamily: "Fredoka_500Medium",
    fontSize: 10,
    color: "#b9d595",
    letterSpacing: 1,
  },
  heading: {
    fontFamily: "Fredoka_700Bold",
    fontSize: 29,
    color: "#eff3dc",
    marginTop: 12,
  },
  body: {
    fontFamily: "Fredoka_500Medium",
    fontSize: 14,
    lineHeight: 22,
    color: "#a7bea7",
    marginVertical: 14,
  },
  manager: {
    fontFamily: "Fredoka_500Medium",
    fontSize: 12,
    color: "#d6f395",
    paddingVertical: 15,
  },
  chip: {
    backgroundColor: "#214632",
    padding: 12,
    borderRadius: 20,
    marginVertical: 5,
  },
  chipText: { fontFamily: "Fredoka_500Medium", color: "#dfedce", fontSize: 12 },
  panel: {
    backgroundColor: "#123929",
    padding: 17,
    borderRadius: 18,
    marginVertical: 10,
  },
  section: {
    fontFamily: "Fredoka_700Bold",
    color: "#d6f395",
    fontSize: 13,
    marginVertical: 12,
  },
  fixture: {
    padding: 15,
    borderRadius: 14,
    backgroundColor: "#123929",
    marginVertical: 6,
    gap: 9,
  },
  name: { fontFamily: "Fredoka_500Medium", fontSize: 15, color: "#f0f3de" },
  small: { fontFamily: "Fredoka_500Medium", fontSize: 10, color: "#a7bea7" },
  score: { fontFamily: "Fredoka_700Bold", fontSize: 20, color: "#d6f395" },
  big: {
    fontFamily: "Fredoka_700Bold",
    fontSize: 35,
    color: "#d6f395",
    marginVertical: 18,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 7,
    paddingHorizontal: 6,
    gap: 5,
  },
  country: {
    flex: 1,
    fontFamily: "Fredoka_500Medium",
    fontSize: 13,
    color: "#e4efcf",
  },
  cell: {
    width: 32,
    fontFamily: "Fredoka_500Medium",
    fontSize: 11,
    color: "#c5d8b8",
    textAlign: "center",
  },
  leader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#214b33",
  },
  rank: {
    fontFamily: "Fredoka_700Bold",
    fontSize: 22,
    color: "#9cbd7e",
    width: 30,
  },
  flow: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginVertical: 20 },
  flowItem: {
    flex: 1,
    minWidth: 48,
    alignItems: "center",
    gap: 9,
    backgroundColor: "#143b28",
    padding: 10,
    borderRadius: 12,
  },
  step: { fontFamily: "Fredoka_700Bold", fontSize: 24, color: "#d6f395" },
  backdrop: {
    flex: 1,
    backgroundColor: "#000b",
    padding: 20,
    justifyContent: "center",
  },
  modal: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "90%",
    alignSelf: "center",
    backgroundColor: "#0b2c21",
    padding: 20,
    borderRadius: 24,
  },
});
