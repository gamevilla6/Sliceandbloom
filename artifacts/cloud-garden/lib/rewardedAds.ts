/** Browser fallback; the native file is selected on iOS and Android. */
export type RewardedRetryStatus = 'loading' | 'ready' | 'showing' | 'unavailable';

export interface RewardedRetry {
  supported: boolean;
  status: RewardedRetryStatus;
  message?: string;
  onPress: () => void;
}

export function initializeRewardedAds(): Promise<void> {
  return Promise.resolve();
}

export function useRewardedRetry(
  _enabled: boolean,
  _onUserEarnedReward: () => void,
): RewardedRetry {
  return { supported: false, status: 'unavailable', onPress: () => {} };
}
