export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
const BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
export async function api<T>(
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  if (!BASE)
    throw Error(
      "Online features need a server. Regular Play is ready offline.",
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(BASE + path, {
      signal: controller.signal,
      method: body ? "POST" : "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw Error(
        "The server is waking up or temporarily unavailable. Please retry. Regular Play is ready.",
      );
    const data = await response.json();
    if (!response.ok)
      throw new ApiError(
        data.error || "Server unavailable. Please try again.",
        response.status,
      );
    return data as T;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError")
      throw Error("Server is taking longer than expected. Please retry.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
export type Daily = { date: string; seed: string };
export type Score = {
  _id: string;
  playerName: string;
  matchesWon: number;
  strength: number;
};
