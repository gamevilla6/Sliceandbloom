import { useCallback, useEffect, useRef } from 'react';
import { useSavedGameData } from './useSavedGameData';
import { completeProgress, DEFAULT_PROGRESS, readProgress, recordDeath as addDeath, type Completion, type Progress, type Settings } from '@/lib/progress';
import { mergeCloudProgress, toCloudProgress, type CloudMode } from '@/lib/cloudProgress';
import { useCloudSync } from '@/components/CloudSyncProvider';
export type { Progress, Settings } from '@/lib/progress';

const KEY = 'cloud-garden:v1';

const DEFAULT = DEFAULT_PROGRESS;

export function useProgress(total: number, key = KEY, cloudMode?: CloudMode) {
  const read = useCallback((raw: unknown) => readProgress(raw, total), [total]);
  const { data: state, ready, update: localUpdate, storageError, saving, retrySave, getCurrent } =
    useSavedGameData(key, DEFAULT, read);
  const cloud = useCloudSync();
  const hydratedEpoch = useRef(0);

  useEffect(() => {
    if (!cloudMode || !ready || cloud.status !== 'hydrating' || cloud.epoch === 0
      || hydratedEpoch.current === cloud.epoch) return;
    const epoch = cloud.epoch;
    hydratedEpoch.current = epoch;
    const local = getCurrent();
    const merged = mergeCloudProgress(local, cloud.progress[cloudMode], total);
    if (JSON.stringify(merged) !== JSON.stringify(local)) localUpdate(() => merged);
    void cloud.syncMode(cloudMode, toCloudProgress(merged)).then((remote) => {
      if (epoch !== hydratedEpoch.current) return;
      const latest = getCurrent();
      const reconciled = mergeCloudProgress(latest, remote, total);
      if (JSON.stringify(reconciled) !== JSON.stringify(latest)) localUpdate(() => reconciled);
      cloud.markModeReady(cloudMode, epoch);
    }).catch(() => {});
  }, [cloudMode, ready, cloud.status, cloud.epoch, cloud.progress, cloud.syncMode,
    cloud.markModeReady, getCurrent, localUpdate, total]);

  const update = useCallback((transition: (current: Progress) => Progress) => {
    const changed = localUpdate(transition);
    if (changed && cloudMode && cloud.status === 'ready') {
      void cloud.syncMode(cloudMode, toCloudProgress(getCurrent())).catch(() => {});
    }
    return changed;
  }, [cloudMode, cloud.status, cloud.syncMode, getCurrent, localUpdate]);

  const flushCloud = useCallback(async () => {
    if (!cloudMode || !cloud.playReady) return false;
    try {
      await cloud.syncMode(cloudMode, toCloudProgress(getCurrent()));
      return cloud.playReady;
    } catch {
      return false;
    }
  }, [cloudMode, cloud.playReady, cloud.syncMode, getCurrent]);

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

  return { progress: state, ready, storageError, saving, retrySave, flushCloud, complete, setLast, setSetting, resetAll, recordDeath, skip, unlockThrough };
}
