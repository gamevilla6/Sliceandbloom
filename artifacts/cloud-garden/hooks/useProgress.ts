import { useCallback } from 'react';
import { useSavedGameData } from './useSavedGameData';
import { completeProgress, DEFAULT_PROGRESS, readProgress, recordDeath as addDeath, type Completion, type Progress, type Settings } from '@/lib/progress';
export type { Progress, Settings } from '@/lib/progress';

const KEY = 'cloud-garden:v1';

const DEFAULT = DEFAULT_PROGRESS;

export function useProgress(total: number, key = KEY) {
  const read = useCallback((raw: unknown) => readProgress(raw, total), [total]);
  const { data: state, ready, update, storageError, saving, retrySave } = useSavedGameData(key, DEFAULT, read);

  const complete = useCallback(
    (idx: number, stars: number, result?: Completion) =>
      update((p) => completeProgress(p, total, idx, stars, result)),
    [update, total],
  );
  const setLast = useCallback((idx: number) => update((p) => (p.last === idx ? p : { ...p, last: idx })), [update]);
  const setSetting = useCallback(
    (k: keyof Settings, v: boolean) => update((p) => ({ ...p, settings: { ...p.settings, [k]: v } })),
    [update],
  );
  const resetAll = useCallback(() => update((p) => ({ ...DEFAULT, settings: p.settings })), [update]);
  const recordDeath = useCallback((idx: number) => update(p => addDeath(p, total, idx)), [update, total]);
  // A skip opens the next stage but never fabricates a clear, star, or score.
  const skip = useCallback((idx: number) => update(p => idx >= 0 && idx + 1 < total
    ? { ...p, unlocked: Math.max(p.unlocked, idx + 1), last: idx + 1 } : p), [update, total]);
  const unlockThrough = useCallback((idx: number) => update(p => idx > p.unlocked
    ? { ...p, unlocked: Math.min(total - 1, idx) } : p), [update, total]);

  return { progress: state, ready, storageError, saving, retrySave, complete, setLast, setSetting, resetAll, recordDeath, skip, unlockThrough };
}
