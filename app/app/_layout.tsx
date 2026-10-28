import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Fredoka_500Medium,
  Fredoka_700Bold,
} from "@expo-google-fonts/fredoka";
import { BrandedLoader } from "../src/Brand";
export default function Layout() {
  const [loaded, error] = useFonts({ Fredoka_500Medium, Fredoka_700Bold });
  return (
    <SafeAreaProvider>
      {loaded || error ? (
        <Stack screenOptions={{ headerShown: false }} />
      ) : (
        <BrandedLoader fontReady={false} />
      )}
    </SafeAreaProvider>
  );
}
