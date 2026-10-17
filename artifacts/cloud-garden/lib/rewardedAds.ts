/** Browser fallback; the native file is selected on iOS and Android. */
import type { RewardedAdReward } from 'react-native-google-mobile-ads';

export type RewardedAdStatus = 'idle' | 'loading' | 'ready' | 'showing' | 'unavailable';

export interface RewardedAdController {
  supported: boolean;
  status: RewardedAdStatus;
  message?: string;
  onPress: () => void;
}

export function initializeRewardedAds(): Promise<void> {
  return Promise.resolve();
}

export function useRewardedAd(
  _enabled: boolean,
  _requestKey: number,
  _onRewardAfterClose: (reward: RewardedAdReward) => void,
): RewardedAdController {
  return { supported: false, status: 'unavailable', onPress: () => {} };
}
