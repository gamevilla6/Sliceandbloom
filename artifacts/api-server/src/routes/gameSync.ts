import { createHash, randomBytes } from "node:crypto";
import { Router, type Request, type RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, gameInstallations } from "@workspace/db";
import {
  GameSyncModeSchema,
  parseModeProgress,
  type GameSyncMode,
} from "@workspace/api-zod";

const router = Router();
type AuthenticatedRequest = Request & { installationId?: string };

function digest(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

const authenticate: RequestHandler = async (req, res, next) => {
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.get("authorization") ?? "")?.[1];
  if (!token) {
    res.status(401).json({ error: "Cloud save authorization is required." });
    return;
  }
  const [installation] = await db.select({ id: gameInstallations.id })
    .from(gameInstallations)
    .where(eq(gameInstallations.tokenHash, digest(token)))
    .limit(1);
  if (!installation) {
    res.status(401).json({ error: "Cloud save authorization is invalid." });
    return;
  }
  (req as AuthenticatedRequest).installationId = installation.id;
  next();
};

router.post("/game/install", async (_req, res) => {
  const token = randomBytes(32).toString("base64url");
  const [installation] = await db.insert(gameInstallations)
    .values({ tokenHash: digest(token), progress: {} })
    .returning({ id: gameInstallations.id });
  if (!installation) {
    res.status(500).json({ error: "Could not create a private save." });
    return;
  }
  // Return the bearer token once; only its SHA-256 digest is ever stored.
  res.status(201).json({ installationId: installation.id, token });
});

router.use("/game", authenticate);

router.get("/game/sync", async (req, res) => {
  const installationId = (req as AuthenticatedRequest).installationId!;
  const [installation] = await db.select({
    progress: gameInstallations.progress,
    updatedAt: gameInstallations.updatedAt,
  }).from(gameInstallations).where(eq(gameInstallations.id, installationId)).limit(1);
  if (!installation) {
    res.status(401).json({ error: "Cloud save is no longer available." });
    return;
  }
  res.json({ progress: installation.progress, updatedAt: installation.updatedAt.toISOString() });
});

router.put("/game/sync/:mode", async (req, res) => {
  const modeResult = GameSyncModeSchema.safeParse(req.params.mode);
  if (!modeResult.success) {
    res.status(404).json({ error: "Unknown game mode." });
    return;
  }
  const mode: GameSyncMode = modeResult.data;
  const progress = parseModeProgress(mode, req.body?.progress);
  if (!progress) {
    res.status(400).json({ error: "Progress data is invalid." });
    return;
  }
  const installationId = (req as AuthenticatedRequest).installationId!;
  const result = await db.transaction(async (tx) => {
    const [current] = await tx.select({ progress: gameInstallations.progress })
      .from(gameInstallations)
      .where(eq(gameInstallations.id, installationId))
      .for("update")
      .limit(1);
    if (!current) return null;
    const next = { ...current.progress, [mode]: progress };
    const [updated] = await tx.update(gameInstallations)
      .set({ progress: next, updatedAt: new Date() })
      .where(eq(gameInstallations.id, installationId))
      .returning({ progress: gameInstallations.progress, updatedAt: gameInstallations.updatedAt });
    return updated ?? null;
  });
  if (!result) {
    res.status(401).json({ error: "Cloud save is no longer available." });
    return;
  }
  res.json({ progress: result.progress[mode], updatedAt: result.updatedAt.toISOString() });
});

router.delete("/game/install", async (req, res) => {
  const installationId = (req as AuthenticatedRequest).installationId!;
  await db.delete(gameInstallations).where(eq(gameInstallations.id, installationId));
  res.status(204).end();
});

export default router;
