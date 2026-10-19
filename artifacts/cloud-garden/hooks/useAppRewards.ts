import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useSavedGameData } from './useSavedGameData';
import { clearSkipEntitlement, consumeHubItem, consumeSkip, equipRewardSkin, grantHubAdReward, spinInkRush, type DailyRewardOffer, type HubRewardAction, type SkinId } from '@/lib/rewardHub';
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
  const { data: profile, ready, storageError, retrySave, update, getCurrent } =
    useSavedGameData<AppRewardProfile>(KEY, DEFAULT_APP_REWARDS, readAppRewardProfile);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = setInterval(tick, 1000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
    return () => { clearInterval(interval); listener.remove(); };
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
  const grantHubAd = useCallback((action: HubRewardAction, receipt: string, offer?: DailyRewardOffer) => {
    const changed = update(p => grantHubAdReward(p, action, Date.now(), receipt, undefined, offer));
    return changed ? getCurrent().history[0]?.label : null;
  }, [update, getCurrent]);
  const spinWheel = useCallback(() => {
    const id = `wager:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const changed = update(p => spinInkRush(p, Date.now(), id));
    return changed ? getCurrent().history[0]?.label : null;
  }, [update, getCurrent]);
  const useRefill = useCallback(() => update(p => consumeHubItem(p, 'inkRefills')), [update]);
  const useSkip = useCallback((genesisOnly: boolean, mode: string, idx: number, total: number) =>
    update(p => consumeSkip(p, genesisOnly, mode, idx, total)), [update]);
  const equipSkin = useCallback((skin: SkinId) => update(p => equipRewardSkin(p, skin)), [update]);
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
