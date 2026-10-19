import { z } from "zod/v4";

export const GAME_SYNC_MODES = ["campaign", "hardcore", "genesis", "void", "singularity"] as const;
export const GameSyncModeSchema = z.enum(GAME_SYNC_MODES);
export type GameSyncMode = (typeof GAME_SYNC_MODES)[number];

export const GAME_SYNC_LEVEL_TOTALS: Record<GameSyncMode, number> = {
  campaign: 100,
  hardcore: 100,
  genesis: 100,
  void: 110,
  singularity: 55,
};

const levelMap = <T extends z.ZodType>(value: T) =>
  z.record(z.string().regex(/^(0|[1-9]\d{0,2})$/), value)
    .refine((entries) => Object.keys(entries).length <= 110, "Too many level records.");

export const GameSyncProgressSchema = z.object({
  unlocked: z.number().int().min(0).max(109),
  last: z.number().int().min(0).max(109),
  stars: levelMap(z.number().int().min(1).max(3)),
  scores: levelMap(z.number().int().min(1).max(100_000_000)),
  bestTimes: levelMap(z.number().finite().positive().max(2_592_000)),
}).strict();
export type GameSyncProgress = z.infer<typeof GameSyncProgressSchema>;

export function parseModeProgress(mode: GameSyncMode, value: unknown): GameSyncProgress | null {
  const parsed = GameSyncProgressSchema.safeParse(value);
  if (!parsed.success) return null;
  const { unlocked, last, stars, scores, bestTimes } = parsed.data;
  const total = GAME_SYNC_LEVEL_TOTALS[mode];
  if (unlocked >= total || last > unlocked) return null;
  for (const records of [stars, scores, bestTimes]) {
    if (Object.keys(records).some((key) => Number(key) >= total || Number(key) > unlocked)) return null;
  }
  return parsed.data;
}
