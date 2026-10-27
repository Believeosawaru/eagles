import { Platform } from "react-native";
import type { RefObject, ComponentRef } from "react";
import type { View } from "react-native";
export async function shareCard(
  ref: RefObject<ComponentRef<typeof View> | null>,
) {
  if (!ref.current) throw Error("Card not ready");
  if (Platform.OS === "web") {
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(ref.current as unknown as HTMLElement, {
      pixelRatio: 2,
      backgroundColor: "#082c26",
    });
    if (!blob) throw Error("Could not create image");
    const file = new File([blob], "eagles-7-0.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "My Eagles 7–0 XI" });
      return;
    }
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const { captureRef } = await import("react-native-view-shot");
    const Sharing = await import("expo-sharing");
    if (!(await Sharing.isAvailableAsync()))
      throw Error("Sharing is unavailable on this device");
    const uri = await captureRef(
      ref.current as Parameters<typeof captureRef>[0],
      { format: "png", quality: 1 },
    );
    await Sharing.shareAsync(uri, {
      mimeType: "image/png",
      dialogTitle: "Share your XI",
    });
  }
}
