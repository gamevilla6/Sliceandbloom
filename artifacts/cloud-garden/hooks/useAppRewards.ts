import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { clearSkipEntitlement, consumeHubItem, consumeSkip, equipRewardSkin, grantHubAdReward, spinInkRush, type HubRewardAction, type SkinId } from '@/lib/rewardHub';
import {
  claimDailyGoldenBrush,
  consumeGoldenBrush,
  consumeGenesisFastPass,
  DEFAULT_APP_REWARDS,
  grantGenesisFastPass,
  localRewardDay,
  readAppRewardProfile,
  recordFastPassTrialClear,
  recordRewardedHint,
  recordRewardedInkRetry,
  type AppRewardProfile,
} from '@/lib/appRewards';

const KEY = 'cloud-garden:app-rewards:v1';

export function useAppRewards() {
  const [profile, setProfile] = useState<AppRewardProfile>(DEFAULT_APP_REWARDS);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string>();
  const [now, setNow] = useState(Date.now);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(true);
  const loaded = useRef(false);
  const loadGeneration = useRef(0);
  const profileRef = useRef(profile);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const next = raw ? readAppRewardProfile(JSON.parse(raw)) : DEFAULT_APP_REWARDS;
      if (!mounted.current || generation !== loadGeneration.current) return;
      profileRef.current = next; loaded.current = true;
      setProfile(next); setReady(true); setStorageError(undefined);
    } catch {
      if (mounted.current && generation === loadGeneration.current) setStorageError('Saved rewards could not be loaded. Retry before claiming or spending.');
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load();
    const tick = () => setNow(Date.now());
    const interval = setInterval(tick, 1000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
    return () => { mounted.current = false; loadGeneration.current++; clearInterval(interval); listener.remove(); };
  }, [load]);

  const persist = useCallback((next: AppRewardProfile) => {
    // Serialize whole-profile writes, so a slow older write cannot erase a
    // subsequent debit, cooldown, ad receipt or skin equip.
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)))
      .then(() => { if (mounted.current) setStorageError(undefined); })
      .catch(() => { if (mounted.current) setStorageError('Rewards are in memory but could not be saved. Retry saving before leaving.'); });
  }, []);

  const update = useCallback((transition: (current: AppRewardProfile) => AppRewardProfile) => {
    if (!loaded.current) return false;
    const current = profileRef.current;
    const next = transition(current);
    if (next === current) return false;
    profileRef.current = next;
    setProfile(next);
    persist(next);
    return true;
  }, [persist]);

  const claimDailyBrush = useCallback(
    () => update((current) => claimDailyGoldenBrush(current, localRewardDay())),
    [update],
  );
  const useGoldenBrush = useCallback(() => update(consumeGoldenBrush), [update]);
  const earnFastPass = useCallback(() => update(grantGenesisFastPass), [update]);
  const useFastPass = useCallback(() => update(consumeGenesisFastPass), [update]);
  const recordInkRetry = useCallback(() => update(recordRewardedInkRetry), [update]);
  const recordHint = useCallback(() => update(recordRewardedHint), [update]);
  const recordFastPassClear = useCallback(() => update(recordFastPassTrialClear), [update]);
  const grantHubAd = useCallback((action: HubRewardAction, receipt: string) => {
    const changed = update(p => grantHubAdReward(p, action, Date.now(), receipt));
    return changed ? profileRef.current.history[0]?.label : null;
  }, [update]);
  const spinWheel = useCallback(() => {
    const id = `wager:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const changed = update(p => spinInkRush(p, Date.now(), id));
    return changed ? profileRef.current.history[0]?.label : null;
  }, [update]);
  const useRefill = useCallback(() => update(p => consumeHubItem(p, 'inkRefills')), [update]);
  const useSkip = useCallback((genesisOnly: boolean, mode: string, idx: number, total: number) =>
    update(p => consumeSkip(p, genesisOnly, mode, idx, total)), [update]);
  const equipSkin = useCallback((skin: SkinId) => update(p => equipRewardSkin(p, skin)), [update]);
  const retrySave = useCallback(() => { if (!loaded.current) void load(); else persist(profileRef.current); }, [load, persist]);
  const clearModeSkips = useCallback((mode: string) => update(p => clearSkipEntitlement(p, mode)), [update]);

  return {
    profile,
    ready,
    now, storageError, grantHubAd, spinWheel, useRefill, useSkip, equipSkin, retrySave, clearModeSkips,
    claimDailyBrush,
    useGoldenBrush,
    earnFastPass,
    useFastPass,
    recordInkRetry,
    recordHint,
    recordFastPassClear,
  };
}
