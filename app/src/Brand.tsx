import { Image, View, Text, StyleSheet, ActivityIndicator } from "react-native";
export const brandImage = require("../assets/brand/eagles-mark.png");
export default function Brand({
  size = 46,
  wordmark = false,
}: {
  size?: number;
  wordmark?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
      <Image
        source={brandImage}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
        accessibilityLabel="Eagles 7–0 eagle and football logo"
      />
      {wordmark && (
        <Text style={s.word}>
          EAGLES <Text style={{ color: "#d6f395" }}>7–0</Text>
        </Text>
      )}
    </View>
  );
}
export function BrandedLoader({
  message = "Getting the pitch ready…",
  fontReady = true,
}: {
  message?: string;
  fontReady?: boolean;
}) {
  return (
    <View style={s.loader}>
      <Brand size={110} />
      <Text style={[s.title, !fontReady && { fontFamily: undefined }]}>
        Eagles 7–0
      </Text>
      <ActivityIndicator color="#d6f395" style={{ marginTop: 18 }} />
      <Text style={[s.caption, !fontReady && { fontFamily: undefined }]}>
        {message}
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  word: { fontFamily: "Fredoka_700Bold", fontSize: 22, color: "#eef4df" },
  loader: {
    flex: 1,
    minHeight: 220,
    backgroundColor: "#071e19",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  title: {
    fontFamily: "Fredoka_700Bold",
    fontSize: 26,
    color: "#d6f395",
    marginTop: 18,
  },
  caption: {
    fontFamily: "Fredoka_500Medium",
    fontSize: 12,
    color: "#aac1a7",
    marginTop: 14,
  },
});
