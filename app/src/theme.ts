export function playful<T extends Record<string, object>>(styles: T): T {
  return Object.fromEntries(
    Object.entries(styles).map(([key, value]) => [
      key,
      "fontSize" in value
        ? {
            ...value,
            fontFamily:
              "fontWeight" in value && Number(value.fontWeight) >= 700
                ? "Fredoka_700Bold"
                : "Fredoka_500Medium",
            fontWeight: "normal",
          }
        : value,
    ]),
  ) as T;
}
