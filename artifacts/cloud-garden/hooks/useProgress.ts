import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'cloud-garden:v1';

export interface Settings {
  haptics: boolean;
  guides: boolean;
  sound: boolean;
}
export interface Progress {
  unlocked: number;
  last: number;
  stars: Record<string, number>;
  settings: Settings;
}

const DEFAULT: Progress = { unlocked: 0, last: 0, stars: {}, settings: { haptics: true, guides: true, sound: true } };

export function useProgress(total: number) {
  const [state, setState] = useState<Progress>(DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const p = JSON.parse(raw) as Partial<Progress>;
          setState({
            ...DEFAULT,
            ...p,
            stars: p.stars ?? {},
            settings: { ...DEFAULT.settings, ...(p.settings ?? {}) },
          });
        } catch {
          // ignore corrupt data
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setState((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const complete = useCallback(
    (idx: number, stars: number) =>
      update((p) => ({
        ...p,
        unlocked: Math.max(p.unlocked, Math.min(idx + 1, total - 1)),
        stars: { ...p.stars, [idx]: Math.max(p.stars[idx] ?? 0, stars) },
      })),
    [update, total],
  );
  const setLast = useCallback((idx: number) => update((p) => (p.last === idx ? p : { ...p, last: idx })), [update]);
  const setSetting = useCallback(
    (k: keyof Settings, v: boolean) => update((p) => ({ ...p, settings: { ...p.settings, [k]: v } })),
    [update],
  );
  const resetAll = useCallback(() => update((p) => ({ ...DEFAULT, settings: p.settings })), [update]);

  return { progress: state, ready, complete, setLast, setSetting, resetAll };
}
