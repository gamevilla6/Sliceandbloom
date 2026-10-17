import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const profileRef = useRef(profile);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!active || !raw) return;
        try {
          const loaded = readAppRewardProfile(JSON.parse(raw));
          profileRef.current = loaded;
          setProfile(loaded);
        } catch {
          // A corrupt local reward record is ignored; the default inventory is safe.
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  const update = useCallback((transition: (current: AppRewardProfile) => AppRewardProfile) => {
    const current = profileRef.current;
    const next = transition(current);
    if (next === current) return false;
    profileRef.current = next;
    setProfile(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
    return true;
  }, []);

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

  return {
    profile,
    ready,
    claimDailyBrush,
    useGoldenBrush,
    earnFastPass,
    useFastPass,
    recordInkRetry,
    recordHint,
    recordFastPassClear,
  };
}
