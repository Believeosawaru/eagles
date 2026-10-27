import Celebration from "./Celebration";
import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Line, Circle, Path } from "react-native-svg";
import type { MatchEvent, Player } from "../../shared/game";
export default function Pitch({
  team,
  event,
  previous,
  progress,
  reduceMotion = false,
}: {
  team: Player[];
  event: MatchEvent;
  previous: MatchEvent;
  progress: number;
  reduceMotion?: boolean;
}) {
  const t =
    reduceMotion || event.kind === "kickoff"
      ? 1
      : Math.max(0, Math.min(1, progress));
  const x = previous.x + (event.x - previous.x) * t,
    y = previous.y + (event.y - previous.y) * t;
  return (
    <View style={s.field} accessibilityLabel={`Virtual pitch. ${event.text}`}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 600 380"
        preserveAspectRatio="none"
      >
        <Rect width="600" height="380" fill="#1b6247" />
        {Array.from({ length: 8 }, (_, i) => (
          <Rect
            key={i}
            x={i * 75}
            width="75"
            height="380"
            fill={i % 2 ? "#1d684a" : "#205f46"}
          />
        ))}
        <Rect
          x="18"
          y="18"
          width="564"
          height="344"
          rx="2"
          stroke="#aad4ac"
          strokeWidth="2"
          fill="none"
        />
        <Line
          x1="300"
          y1="18"
          x2="300"
          y2="362"
          stroke="#aad4ac"
          strokeWidth="2"
        />
        <Circle
          cx="300"
          cy="190"
          r="46"
          stroke="#aad4ac"
          fill="none"
          strokeWidth="2"
        />
        <Rect
          x="18"
          y="95"
          width="85"
          height="190"
          fill="none"
          stroke="#aad4ac"
        />
        <Rect
          x="497"
          y="95"
          width="85"
          height="190"
          fill="none"
          stroke="#aad4ac"
        />
        <Rect
          x="18"
          y="142"
          width="30"
          height="96"
          fill="none"
          stroke="#aad4ac"
        />
        <Rect
          x="552"
          y="142"
          width="30"
          height="96"
          fill="none"
          stroke="#aad4ac"
        />
        <Path d="M4 162H18V218H4Z M582 162H596V218H582Z" fill="#d4e1cd" />
      </Svg>
      {event.positions.map((point, i) => {
        const from = previous.positions[i] || point;
        const px = from.x + (point.x - from.x) * t,
          py = from.y + (point.y - from.y) * t;
        return (
          <View
            key={i}
            style={[
              s.dot,
              {
                left: `${px}%`,
                top: `${py}%`,
                backgroundColor: i >= 11 ? "#e29a74" : "#d6f394",
                borderColor: event.owner === i ? "#ffffff" : "#09291e",
                borderWidth: event.owner === i ? 2 : 1,
              },
            ]}
          >
            <Text style={s.number}>{(i % 11) + 1}</Text>
          </View>
        );
      })}
      <View
        style={[
          s.ball,
          {
            left: `${x}%`,
            top: `${y - (event.flight ? Math.sin(t * Math.PI) * 3 : 0)}%`,
          },
        ]}
      >
        <View
          style={{
            width: 6,
            height: 6,
            backgroundColor: "#173326",
            transform: [{ rotate: "30deg" }],
            borderRadius: 1,
          }}
        />
      </View>
      {event.kind === "goal" && (
        <Celebration
          key={event.minute + ":" + event.scorer}
          home={event.side === "home"}
          reduce={reduceMotion}
        />
      )}
      <View style={s.label}>
        <Text style={{ fontSize: 8, color: "#d3e5bc" }}>
          ● NIGERIA ● OPPOSITION · SIMULATION
        </Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  field: {
    aspectRatio: 600 / 380,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    marginVertical: 16,
  },
  dot: {
    position: "absolute",
    width: 19,
    height: 19,
    borderRadius: 10,
    marginLeft: -9,
    marginTop: -9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#09291e",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  number: { fontSize: 8, fontWeight: "900", color: "#153c29" },
  ball: {
    position: "absolute",
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginLeft: -7,
    marginTop: -7,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  goal: {
    position: "absolute",
    left: "30%",
    right: "30%",
    top: "30%",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#092b24ed",
    zIndex: 3,
  },
  goalText: { fontSize: 30, fontWeight: "900", color: "#d6f394" },
  label: {
    position: "absolute",
    bottom: 5,
    alignSelf: "center",
    backgroundColor: "#08291dbb",
    padding: 3,
    borderRadius: 3,
  },
});
