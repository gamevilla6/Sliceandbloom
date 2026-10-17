import { useCallback, useEffect, useRef } from 'react';
import type { RewardedAdReward } from 'react-native-google-mobile-ads';
import { adManager, initializeAds } from './AdManager';
import { useAdNexus } from '@/hooks/useAdNexus';
import type { RewardedAdController } from './rewardedAds';

/** Compatibility facade: all native requests now share the central manager. */
export const initializeRewardedAds = initializeAds;
export function useRewardedAd(enabled: boolean, requestKey: number,
  onRewardAfterClose: (reward: RewardedAdReward) => void): RewardedAdController {
  const snapshot = useAdNexus();
  const callback = useRef(onRewardAfterClose);
  callback.current = onRewardAfterClose;
  useEffect(() => {
    if (enabled) adManager.preload('rewarded', true);
  }, [enabled, requestKey]);
  const onPress = useCallback(() => {
    if (enabled) adManager.showRewarded(reward => callback.current(reward));
  }, [enabled]);
  return { supported: true, status: enabled ? snapshot.rewarded : 'idle',
    message: enabled ? snapshot.rewardedMessage : undefined, onPress };
}
