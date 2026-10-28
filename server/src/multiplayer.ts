import { Router } from "express";
import mongoose from "mongoose";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { options, lineup, simulateDuel } from "../../shared/game.js";
const playerSchema = new mongoose.Schema(
  { id: String, name: String, tokenHash: String, picks: [String] },
  { _id: false },
);
const roomSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },
    seed: { type: String, required: true },
    phase: {
      type: String,
      enum: ["waiting", "draft", "finished", "cancelled"],
      required: true,
    },
    players: [playerSchema],
    result: mongoose.Schema.Types.Mixed,
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const MultiplayerRoom = mongoose.model("MultiplayerRoom", roomSchema);
const nameSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(24)
      .regex(/^[\p{L}\p{N} ._'’-]+$/u),
  })
  .strict();
export function multiplayerRouter(secret: string) {
  const router = Router();
  const hash = (value: string) =>
    createHmac("sha256", secret).update(value).digest("hex");
  router.use(
    rateLimit({
      windowMs: 60000,
      limit: 80,
      message: { error: "Too many room requests. Please wait a minute." },
    }),
  );
  const writes = rateLimit({
    windowMs: 60000,
    limit: 40,
    message: { error: "Too many room actions. Please wait a minute." },
  });
  function payload(room: any, seat: number) {
    const me = room.players[seat];
    return {
      code: room.code,
      phase: room.phase,
      expiresAt: room.expiresAt,
      you: seat,
      players: room.players.map((p: any) => ({
        id: p.id,
        name: p.name,
        count: p.picks.length,
        ...(room.phase === "finished" ? { picks: p.picks } : {}),
      })),
      picks: me.picks,
      choices:
        room.phase === "draft" && me.picks.length < 11
          ? options(room.seed, [...me.picks])
          : null,
      result: room.phase === "finished" ? room.result : null,
    };
  }
  async function authorised(req: any, res: any) {
    if (!/^[A-F0-9]{8}$/.test(String(req.params.code))) {
      res.status(404).json({ error: "Room not found." });
      return null;
    }
    const room = await MultiplayerRoom.findOne({
      code: req.params.code,
      expiresAt: { $gt: new Date() },
    });
    if (!room) {
      res.status(404).json({
        error: "This room expired or does not exist. Create another room.",
      });
      return null;
    }
    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    if (!/^[a-f0-9]{64}$/.test(token)) {
      res.status(401).json({ error: "Please rejoin the room on this device." });
      return null;
    }
    const digest = Buffer.from(hash(token));
    const seat = room.players.findIndex(
      (p) => p.tokenHash && timingSafeEqual(digest, Buffer.from(p.tokenHash)),
    );
    if (seat < 0) {
      res.status(403).json({ error: "This room belongs to other players." });
      return null;
    }
    return { room, seat };
  }
  router.post("/", writes, async (req, res) => {
    const input = nameSchema.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({
        error: "Use a manager name of 2–24 letters, numbers or spaces.",
      });
      return;
    }
    const token = randomBytes(32).toString("hex");
    let room;
    for (let i = 0; i < 3; i++) {
      try {
        room = await MultiplayerRoom.create({
          code: randomBytes(4).toString("hex").toUpperCase(),
          seed: randomBytes(24).toString("hex"),
          phase: "waiting",
          players: [
            {
              id: randomBytes(12).toString("hex"),
              name: input.data.name,
              tokenHash: hash(token),
              picks: [],
            },
          ],
          expiresAt: new Date(Date.now() + 30 * 60000),
        });
        break;
      } catch (e) {
        if ((e as { code?: number }).code !== 11000) throw e;
      }
    }
    if (!room) {
      res.status(503).json({ error: "Could not create a room. Please retry." });
      return;
    }
    res.status(201).json({ token, state: payload(room, 0) });
  });
  router.post("/:code/join", writes, async (req, res) => {
    const input = nameSchema.safeParse(req.body);
    if (!input.success || !/^[A-F0-9]{8}$/.test(String(req.params.code))) {
      res
        .status(400)
        .json({ error: "Check the room code and your manager name." });
      return;
    }
    const token = randomBytes(32).toString("hex");
    const room = await MultiplayerRoom.findOneAndUpdate(
      {
        code: req.params.code,
        phase: "waiting",
        expiresAt: { $gt: new Date() },
        players: { $size: 1 },
      },
      {
        $push: {
          players: {
            id: randomBytes(12).toString("hex"),
            name: input.data.name,
            tokenHash: hash(token),
            picks: [],
          },
        },
        $set: { phase: "draft" },
      },
      { new: true },
    );
    if (!room) {
      res
        .status(409)
        .json({ error: "Room is full, expired or already started." });
      return;
    }
    res.json({ token, state: payload(room, 1) });
  });
  router.get("/:code", async (req, res) => {
    const found = await authorised(req, res);
    if (found) res.json(payload(found.room, found.seat));
  });
  router.post("/:code/pick", writes, async (req, res) => {
    const found = await authorised(req, res);
    if (!found) return;
    const { room, seat } = found;
    const input = z
      .object({
        choice: z.string().max(12),
        count: z.number().int().min(0).max(10),
      })
      .strict()
      .safeParse(req.body);
    const picks = [...room.players[seat].picks];
    if (
      !input.success ||
      room.phase !== "draft" ||
      input.data.count !== picks.length ||
      picks.length >= 11 ||
      !options(room.seed, picks).players.some((p) => p.id === input.data.choice)
    ) {
      res
        .status(409)
        .json({ error: "That pick is no longer available. Refresh the room." });
      return;
    }
    let updated = await MultiplayerRoom.findOneAndUpdate(
      {
        _id: room._id,
        phase: "draft",
        [`players.${seat}.picks`]: { $size: picks.length },
      },
      { $push: { [`players.${seat}.picks`]: input.data.choice } },
      { new: true },
    );
    if (!updated) {
      res
        .status(409)
        .json({ error: "A pick was already received. Refresh the room." });
      return;
    }
    if (
      updated.players.length === 2 &&
      updated.players.every((p) => p.picks.length === 11)
    ) {
      const home = lineup(updated.seed, [...updated.players[0].picks]),
        away = lineup(updated.seed, [...updated.players[1].picks]);
      const result = simulateDuel(home, away, updated.seed);
      updated =
        (await MultiplayerRoom.findOneAndUpdate(
          { _id: updated._id, phase: "draft" },
          { $set: { phase: "finished", result } },
          { new: true },
        )) || (await MultiplayerRoom.findById(updated._id));
    }
    if (updated) res.json(payload(updated, seat));
    else res.status(404).json({ error: "Room no longer exists." });
  });
  router.post("/:code/leave", writes, async (req, res) => {
    const found = await authorised(req, res);
    if (!found) return;
    await MultiplayerRoom.updateOne(
      { _id: found.room._id, phase: { $in: ["waiting", "draft"] } },
      { $set: { phase: "cancelled" } },
    );
    res.json({ ok: true });
  });
  return router;
}
