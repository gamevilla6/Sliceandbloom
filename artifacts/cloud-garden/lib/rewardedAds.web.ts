import type { RewardedRetry } from './rewardedAds.native';

/** Native AdMob is not available in browser previews. */
export function initializeRewardedAds(): Promise<void> {
  return Promise.resolve();
}

export function useRewardedRetry(
  _enabled: boolean,
  _onUserEarnedReward: () => void,
): { supported: false } {
  return { supported: false };
}

export type { RewardedRetry };
