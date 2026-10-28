import { useState } from "react";
import { Image, View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { photos } from "./photos";
import type { Player } from "../../shared/game";
export default function Portrait({
  player,
  size = 100,
}: {
  player: Player;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <View
      style={{
        width: "100%",
        height: size,
        backgroundColor: "#234a3b",
        overflow: "hidden",
        borderRadius: 12,
      }}
    >
      {photos[player.id] && !failed ? (
        <Image
          source={photos[player.id]}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
          accessibilityLabel={player.name}
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Circle cx="50" cy="36" r="18" fill="#719980" />
            <Path d="M15 100V89C15 58 85 58 85 89V100" fill="#719980" />
          </Svg>
          <Text
            style={{
              position: "absolute",
              bottom: 5,
              alignSelf: "center",
              fontSize: 8,
              color: "#d2e6ca",
            }}
          >
            PHOTO UNAVAILABLE
          </Text>
        </>
      )}
    </View>
  );
}
