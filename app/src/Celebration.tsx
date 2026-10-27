import { useEffect, useRef } from "react";
import { Animated, View, Text, StyleSheet, Easing } from "react-native";
export default function Celebration({
  home,
  reduce,
}: {
  home: boolean;
  reduce: boolean;
}) {
  const burst = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) {
      burst.setValue(1);
      return;
    }
    const animation = Animated.timing(burst, {
      toValue: 1,
      duration: 2100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [burst, reduce]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {!reduce &&
        Array.from({ length: 20 }, (_, i) => (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              top: "45%",
              left: "50%",
              width: 6,
              height: 12,
              backgroundColor: i % 2 ? "#d6f395" : "#fff",
              opacity: burst.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [1, 1, 0],
              }),
              transform: [
                {
                  translateX: burst.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.cos(i * 2.4) * 170],
                  }),
                },
                {
                  translateY: burst.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -50 - Math.sin(i) * 50, 90],
                  }),
                },
                {
                  rotate: burst.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", `${i * 47}deg`],
                  }),
                },
              ],
            }}
          />
        ))}
      <Animated.View
        style={[
          s.banner,
          {
            transform: [
              {
                scale: reduce
                  ? 1
                  : burst.interpolate({
                      inputRange: [0, 0.2, 1],
                      outputRange: [0.6, 1.06, 1],
                    }),
              },
            ],
          },
        ]}
      >
        <Text style={s.title}>GOOOAL!</Text>
        <Text style={s.sub}>
          {home ? "NIGERIA! LET’S GO!" : "THE OPPOSITION STRIKE"}
        </Text>
      </Animated.View>
    </View>
  );
}
const s = StyleSheet.create({
  banner: {
    position: "absolute",
    top: "28%",
    alignSelf: "center",
    padding: 15,
    borderRadius: 18,
    backgroundColor: "#08291df2",
    alignItems: "center",
  },
  title: { fontFamily: "Fredoka_700Bold", fontSize: 34, color: "#d6f395" },
  sub: {
    fontFamily: "Fredoka_500Medium",
    color: "#e7f4d1",
    fontSize: 10,
    marginTop: 4,
  },
});
