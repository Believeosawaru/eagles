import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";
import {
  useFonts,
  Fredoka_500Medium,
  Fredoka_700Bold,
} from "@expo-google-fonts/fredoka";
export default function Layout() {
  const [loaded, error] = useFonts({ Fredoka_500Medium, Fredoka_700Bold });
  return (
    <SafeAreaProvider>
      {loaded || error ? (
        <Stack screenOptions={{ headerShown: false }} />
      ) : (
        <View
          style={{
            flex: 1,
            backgroundColor: "#071e19",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color="#d6f395" />
        </View>
      )}
    </SafeAreaProvider>
  );
}
