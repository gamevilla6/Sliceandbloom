export interface Settings { haptics: boolean; guides: boolean; sound: boolean }
export interface Progress {
  unlocked: number; last: number;
  stars: Record<string, number>;
  scores: Record<string, number>;
  bestTimes: Record<string, number>;
  deaths: Record<string, number>;
  badges: Record<string, string>;
  settings: Settings;
}
export interface Completion { score: number; time: number }
export const DEFAULT_PROGRESS: Progress = {
  unlocked: 0, last: 0, stars: {}, scores: {}, bestTimes: {}, deaths: {}, badges: {},
  settings: { haptics: true, guides: true, sound: true },
};

function record(value: unknown, total: number, max = Infinity): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, n]) =>
    /^\d+$/.test(key) && Number(key) < total && typeof n === 'number'
    && Number.isFinite(n) && n > 0 && n <= max));
}

/** Backward-compatible migration; stars from the former final bed unlock appended beds. */
export function readProgress(raw: unknown, total: number): Progress {
  const p = raw && typeof raw === 'object' ? raw as Partial<Progress> : {};
  const stars = record(p.stars, total, 3);
  const earned = Object.keys(stars).reduce((next, key) => Math.max(next, Number(key) + 1), 0);
  const clamp = (n: unknown) => typeof n === 'number' && Number.isFinite(n)
    ? Math.max(0, Math.min(total - 1, Math.floor(n))) : 0;
  const unlocked = Math.min(total - 1, Math.max(clamp(p.unlocked), earned));
  const settings = { ...DEFAULT_PROGRESS.settings };
  for (const key of ['haptics', 'sound', 'guides'] as const) {
    if (typeof p.settings?.[key] === 'boolean') settings[key] = p.settings[key];
  }
  return {
    unlocked, last: Math.min(unlocked, clamp(p.last)), stars, settings,
    scores: record(p.scores, total), bestTimes: record(p.bestTimes, total),
    deaths: Object.fromEntries(Object.entries(record(p.deaths, total, Number.MAX_SAFE_INTEGER))
      .filter(([, n]) => Number.isInteger(n))),
    // Badges are derived from earned stars, never trusted independently.
    badges: Object.fromEntries(Object.entries(stars).map(([idx, n]) => [idx, n === 3 ? 'Gold' : 'Cleared'])),
  };
}

export function completeProgress(p: Progress, total: number, idx: number, stars: number, result?: Completion): Progress {
  if (!Number.isInteger(idx) || idx < 0 || idx >= total || !Number.isFinite(stars)) return p;
  const valid = result && Number.isFinite(result.score) && result.score > 0
    && Number.isFinite(result.time) && result.time > 0;
  return {
    ...p, unlocked: Math.max(p.unlocked, Math.min(idx + 1, total - 1)),
    stars: { ...p.stars, [idx]: Math.max(p.stars[idx] ?? 0, Math.min(3, Math.max(1, Math.floor(stars)))) },
    scores: valid ? { ...p.scores, [idx]: Math.max(p.scores[idx] ?? 0, result.score) } : p.scores,
    bestTimes: valid ? { ...p.bestTimes, [idx]: Math.min(p.bestTimes[idx] ?? Infinity, result.time) } : p.bestTimes,
    badges: { ...p.badges, [idx]: Math.max(p.stars[idx] ?? 0, stars) >= 3 ? 'Gold' : 'Cleared' },
  };
}

export function recordDeath(p: Progress, total: number, idx: number): Progress {
  if (!Number.isInteger(idx) || idx < 0 || idx >= total) return p;
  return { ...p, deaths: { ...p.deaths, [idx]: Math.min(Number.MAX_SAFE_INTEGER, (p.deaths[idx] ?? 0) + 1) } };
}
