import { readProgress, type Progress } from "./progress";

export type CloudMode = "campaign" | "hardcore" | "genesis" | "void" | "singularity";
export type CloudProgress = Pick<Progress, "unlocked" | "last" | "stars" | "scores" | "bestTimes">;
export type CloudProgressBundle = Partial<Record<CloudMode, CloudProgress>>;

export const CLOUD_PROGRESS_MODES: Record<CloudMode, { key: string; total: number }> = {
  campaign: { key: "cloud-garden:v1", total: 100 },
  hardcore: { key: "cloud-garden:hardcore:v1", total: 100 },
  genesis: { key: "cloud-garden:genesis:v1", total: 100 },
  void: { key: "cloud-garden:void:v1", total: 110 },
  singularity: { key: "cloud-garden:singularity:v1", total: 55 },
};

export function toCloudProgress(progress: Progress): CloudProgress {
  return {
    unlocked: progress.unlocked,
    last: progress.last,
    stars: { ...progress.stars },
    scores: { ...progress.scores },
    bestTimes: { ...progress.bestTimes },
  };
}

/** Preserve device preferences/death counters while keeping the best merged record. */
export function mergeCloudProgress(local: Progress, remote: CloudProgress | undefined, total: number): Progress {
  if (!remote) return readProgress(local, total);
  const localHasProgress = local.unlocked > 0 || Object.keys(local.stars).length > 0
    || Object.keys(local.scores).length > 0 || Object.keys(local.bestTimes).length > 0;
  const maxMap = (a: Record<string, number>, b: Record<string, number>) =>
    Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])]
      .map((key) => [key, Math.max(a[key] ?? 0, b[key] ?? 0)]));
  const minMap = (a: Record<string, number>, b: Record<string, number>) => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return Object.fromEntries([...keys].flatMap((key) => {
      const values = [a[key], b[key]].filter((value): value is number => typeof value === "number");
      return values.length ? [[key, Math.min(...values)]] : [];
    }));
  };
  return readProgress({
    ...local,
    unlocked: Math.max(local.unlocked, remote.unlocked),
    last: localHasProgress ? local.last : remote.last,
    stars: maxMap(local.stars, remote.stars),
    scores: maxMap(local.scores, remote.scores),
    bestTimes: minMap(local.bestTimes, remote.bestTimes),
  }, total);
}

export function parseCloudProgress(mode: CloudMode, value: unknown): CloudProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid cloud progress response.");
  const data = value as Record<string, unknown>;
  const total = CLOUD_PROGRESS_MODES[mode].total;
  const validLevel = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < total;
  const readMap = (raw: unknown, kind: "stars" | "scores" | "bestTimes", unlocked: number) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid cloud progress response.");
    const entries = Object.entries(raw);
    if (entries.length > total || entries.some(([key, n]) => !/^(0|[1-9]\d{0,2})$/.test(key)
      || !validLevel(Number(key))
      || Number(key) > unlocked
      || typeof n !== "number" || !Number.isFinite(n)
      || (kind === "stars" ? !Number.isInteger(n) || n < 1 || n > 3 : n <= 0))) {
      throw new Error("Invalid cloud progress response.");
    }
    return Object.fromEntries(entries) as Record<string, number>;
  };
  if (!Number.isInteger(data.unlocked) || !validLevel(data.unlocked)
    || !Number.isInteger(data.last) || !validLevel(data.last) || (data.last as number) > (data.unlocked as number)) {
    throw new Error("Invalid cloud progress response.");
  }
  return {
    unlocked: data.unlocked as number,
    last: data.last as number,
    stars: readMap(data.stars, "stars", data.unlocked as number),
    scores: readMap(data.scores, "scores", data.unlocked as number),
    bestTimes: readMap(data.bestTimes, "bestTimes", data.unlocked as number),
  };
}
