import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

type GameSyncMode = "campaign" | "hardcore" | "genesis" | "void" | "singularity";
type GameSyncProgress = {
  unlocked: number;
  last: number;
  stars: Record<string, number>;
  scores: Record<string, number>;
  bestTimes: Record<string, number>;
};
export const gameInstallations = pgTable("game_installations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  progress: jsonb("progress").$type<Partial<Record<GameSyncMode, GameSyncProgress>>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GameInstallation = typeof gameInstallations.$inferSelect;
