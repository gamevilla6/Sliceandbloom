import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdEventType,
  mobileAds,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

export type RewardedRetryStatus = 'loading' | 'ready' | 'showing' | 'unavailable';

export interface RewardedRetry {
  supported: true;
  status: RewardedRetryStatus;
  message?: string;
  onPress: () => void;
}

let initialization: Promise<unknown> | null = null;

/** Initialize the native Google Mobile Ads SDK once for the app process. */
export function initializeRewardedAds(): Promise<unknown> {
  initialization ??= mobileAds().initialize().catch((error: unknown) => {
    initialization = null;
    throw error;
  });
  return initialization;
}

/**
 * Preloads one opt-in rewarded retry while the normal campaign failure card is open.
 * A retry is granted only by Google's EARNED_REWARD event; closing/skipping or an
 * ad error never invokes the reward callback.
 */
export function useRewardedRetry(
  enabled: boolean,
  onUserEarnedReward: () => void,
): RewardedRetry {
  const [status, setStatus] = useState<RewardedRetryStatus>('loading');
  const [message, setMessage] = useState<string>();
  const onRewardRef = useRef(onUserEarnedReward);
  const adRef = useRef<RewardedAd | null>(null);
  const loadedRef = useRef(false);
  const showingRef = useRef(false);
  const earnedRef = useRef(false);

  onRewardRef.current = onUserEarnedReward;

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    let ad: RewardedAd | null = null;
    let removeLoaded = () => {};
    let removeEarned = () => {};
    let removeClosed = () => {};
    let removeError = () => {};

    const load = async () => {
      try {
        await initializeRewardedAds();
        if (!active) return;

        // TestIds.REWARDED selects Google's official iOS/Android test unit ID.
        ad = RewardedAd.createForAdRequest(TestIds.REWARDED, {
          requestNonPersonalizedAdsOnly: true,
        });
        adRef.current = ad;

        removeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          if (!active) return;
          loadedRef.current = true;
          setMessage(undefined);
          setStatus('ready');
        });

        // This is the sole place that grants the retry. An ad close is not enough.
        removeEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          if (!active || earnedRef.current) return;
          earnedRef.current = true;
          onRewardRef.current();
        });

        removeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
          if (!active) return;
          loadedRef.current = false;
          showingRef.current = false;
          setStatus('loading');
          if (!earnedRef.current) {
            setMessage('The ad ended before the reward was earned. You can retry normally.');
          }
          // Preload another ad only while this failure card remains open.
          ad?.load();
        });

        removeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
          if (!active) return;
          loadedRef.current = false;
          showingRef.current = false;
          setStatus('unavailable');
          setMessage('No rewarded ad is available right now. Use Retry to keep playing.');
          console.warn('[ads] Rewarded ad error.', error);
        });

        ad.load();
      } catch (error) {
        if (!active) return;
        loadedRef.current = false;
        setStatus('unavailable');
        setMessage('Rewarded ads could not start. Use Retry to keep playing.');
        console.warn('[ads] Rewarded ad setup failed.', error);
      }
    };

    loadedRef.current = false;
    showingRef.current = false;
    earnedRef.current = false;
    setStatus('loading');
    setMessage(undefined);
    void load();

    return () => {
      active = false;
      removeLoaded();
      removeEarned();
      removeClosed();
      removeError();
      ad?.removeAllListeners();
      ad?.destroy();
      if (adRef.current === ad) adRef.current = null;
      loadedRef.current = false;
      showingRef.current = false;
    };
  }, [enabled]);

  const onPress = useCallback(() => {
    const ad = adRef.current;
    if (!ad || !loadedRef.current || showingRef.current) return;
    showingRef.current = true;
    earnedRef.current = false;
    setMessage(undefined);
    setStatus('showing');
    ad.show().catch((error: unknown) => {
      loadedRef.current = false;
      showingRef.current = false;
      setStatus('unavailable');
      setMessage('The ad could not be shown. Use Retry to keep playing.');
      console.warn('[ads] Rewarded ad show failed.', error);
    });
  }, []);

  return { supported: true, status, message, onPress };
}
