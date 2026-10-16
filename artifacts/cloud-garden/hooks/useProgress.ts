import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeProgress, DEFAULT_PROGRESS, readProgress, recordDeath as addDeath, type Completion, type Progress, type Settings } from '@/lib/progress';
export type { Progress, Settings } from '@/lib/progress';

const KEY = 'cloud-garden:v1';

const DEFAULT = DEFAULT_PROGRESS;

export function useProgress(total: number, key = KEY) {
  const [state, setState] = useState<Progress>(DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!raw) return;
        try {
          setState(readProgress(JSON.parse(raw), total));
        } catch {
          // ignore corrupt data
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [total, key]);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setState((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [key]);

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

  return { progress: state, ready, complete, setLast, setSetting, resetAll, recordDeath };
}
