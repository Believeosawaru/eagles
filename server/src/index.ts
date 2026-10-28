import { multiplayerRouter, MultiplayerRoom } from "./multiplayer.js";
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { z } from "zod";
import { createHmac } from "node:crypto";
import { lineup, simulate } from "../../shared/game.js";
const env = z
  .object({
    MONGODB_URI: z.string().min(1),
    SEED_SECRET: z.string().min(24),
    WEB_ORIGINS: z.string().default("http://localhost:8081"),
    PORT: z.coerce.number().default(4000),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  })
  .parse(process.env);
const dailySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  seed: { type: String, required: true },
});
const scoreSchema = new mongoose.Schema({
  rulesVersion: { type: Number, required: true, default: 4 },
  playerName: { type: String, required: true },
  date: { type: String, required: true },
  matchesWon: { type: Number, required: true },
  strength: { type: Number, required: true },
  submitter: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now },
});
scoreSchema.index({ date: 1, submitter: 1 }, { unique: true });
scoreSchema.index({ date: 1, matchesWon: -1, strength: -1, createdAt: 1 });
const DailyChallenge = mongoose.model("DailyChallenge", dailySchema),
  Score = mongoose.model("Score", scoreSchema);
const app = express();
app.set("trust proxy", env.TRUST_PROXY);
app.disable("x-powered-by");
app.use(helmet());
const origins = new Set(env.WEB_ORIGINS.split(",").map((s) => s.trim()));
app.use(
  cors({ origin: (origin, cb) => cb(null, !origin || origins.has(origin)) }),
);
app.use(express.json({ limit: "8kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 90,
    message: { error: "Too many requests. Please retry in a minute." },
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
const date = () => new Date().toISOString().slice(0, 10);
const hash = (s: string) =>
  createHmac("sha256", env.SEED_SECRET).update(s).digest("hex");
async function challenge() {
  const day = date();
  try {
    return await DailyChallenge.findOneAndUpdate(
      { date: day },
      { $set: { seed: hash("daily-v4:" + day) } },
      { new: true, upsert: true },
    );
  } catch (e) {
    if ((e as { code?: number }).code === 11000)
      return await DailyChallenge.findOne({ date: day });
    throw e;
  }
}
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/daily", async (_req, res) => {
  const d = await challenge();
  if (!d) throw Error("Challenge unavailable");
  res.json({ date: d.date, seed: d.seed });
});
const scoreInput = z
  .object({
    playerName: z
      .string()
      .trim()
      .min(2)
      .max(24)
      .regex(/^[\p{L}\p{N} ._'’-]+$/u),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    picks: z.array(z.string().max(20)).length(11),
    config: z
      .object({
        tactic: z.enum(["balanced", "attack", "counter"]),
        captain: z.string().max(20),
        difficulty: z.literal("standard"),
      })
      .strict(),
  })
  .strict();
app.post(
  "/api/scores",
  rateLimit({
    windowMs: 60000,
    limit: 8,
    message: { error: "Too many submissions. Please retry in a minute." },
  }),
  async (req, res) => {
    const parsed = scoreInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Use a 2–24 character name and a complete valid draft.",
      });
      return;
    }
    if (parsed.data.date !== date()) {
      res
        .status(400)
        .json({ error: "This challenge has ended. Start today’s challenge." });
      return;
    }
    const d = await challenge();
    if (!d) throw Error("Challenge unavailable");
    let result;
    try {
      if (
        parsed.data.config.captain &&
        !parsed.data.picks.includes(parsed.data.config.captain)
      )
        throw Error("Invalid captain");
      result = simulate(
        lineup(d.seed!, parsed.data.picks),
        d.seed!,
        parsed.data.config,
      );
    } catch {
      res.status(400).json({ error: "Invalid draft choices." });
      return;
    }
    try {
      const score = await Score.create({
        playerName: parsed.data.playerName,
        date: d.date,
        matchesWon: result.wins,
        strength: result.strength,
        submitter: hash("score:v4:" + d.date + ":" + req.ip),
      });
      res.status(201).json({
        id: score.id,
        matchesWon: score.matchesWon,
        strength: score.strength,
      });
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        res.status(409).json({
          error: "A score was already submitted from this network today.",
        });
        return;
      }
      throw e;
    }
  },
);
app.get("/api/leaderboard", async (req, res) => {
  const day = typeof req.query.date === "string" ? req.query.date : date();
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    Number.isNaN(Date.parse(day + "T00:00:00Z")) ||
    new Date(day + "T00:00:00Z").toISOString().slice(0, 10) !== day
  ) {
    res.status(400).json({ error: "Invalid date." });
    return;
  }
  res.json(
    await Score.find({ date: day, rulesVersion: 4 })
      .select("playerName date matchesWon strength createdAt")
      .sort({ matchesWon: -1, strength: -1, createdAt: 1 })
      .limit(50)
      .lean(),
  );
});
app.use("/api/rooms", multiplayerRouter(env.SEED_SECRET));
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err instanceof Error ? err.message : "Request failed");
    const status =
      typeof err === "object" &&
      err &&
      "status" in err &&
      (err.status === 400 || err.status === 413)
        ? err.status
        : 500;
    res.status(status).json({
      error:
        status === 400
          ? "Invalid JSON request."
          : status === 413
            ? "Request is too large."
            : "Server unavailable. Please retry shortly.",
    });
  },
);
await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
await Promise.all([
  DailyChallenge.init(),
  Score.init(),
  MultiplayerRoom.init(),
]);
const server = app.listen(env.PORT, "0.0.0.0", () =>
  console.log(`Eagles API listening on ${env.PORT}`),
);
process.on("SIGTERM", () =>
  server.close(() => {
    void mongoose.disconnect().then(() => process.exit(0));
  }),
);
