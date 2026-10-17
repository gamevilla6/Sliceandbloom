import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  AdsConsent,
  AdEventType,
  default as mobileAds,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import type { RewardedAdReward } from 'react-native-google-mobile-ads';
import type { RewardedAdController, RewardedAdStatus } from './rewardedAds';

let initialization: Promise<unknown> | null = null;

function getRewardedUnitId(): string {
  if (__DEV__) return TestIds.REWARDED;
  const productionUnitId = Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
    // Ad unit IDs are public identifiers; this Android production unit was
    // supplied for this app. Debug builds always use Google's test unit above.
    android: 'ca-app-pub-3691647720194867/7981531326',
  });
  if (!productionUnitId) {
    throw new Error('Set EXPO_PUBLIC_ADMOB_REWARDED_IOS before enabling production iOS ads.');
  }
  return productionUnitId;
}

/** Initialize the native Google Mobile Ads SDK once for the app process. */
export function initializeRewardedAds(): Promise<unknown> {
  if (initialization) return initialization;
  const promise = (async () => {
    // UMP presents a consent form only when required for this user/region.
    const consent = await AdsConsent.gatherConsent();
    if (!consent.canRequestAds) {
      throw new Error('User consent or regional rules do not currently permit ad requests.');
    }
    return mobileAds().initialize();
  })().catch((error: unknown) => {
    initialization = null;
    throw error;
  });
  initialization = promise;
  return promise;
}

/**
 * Loads one ad for the selected reward. Credit is issued only after both
 * EARNED_REWARD and CLOSED arrive, so dismissing early never grants inventory.
 */
export function useRewardedAd(
  enabled: boolean,
  requestKey: number,
  onRewardAfterClose: (reward: RewardedAdReward) => void,
): RewardedAdController {
  const [status, setStatus] = useState<RewardedAdStatus>('idle');
  const [message, setMessage] = useState<string>();
  const onRewardRef = useRef(onRewardAfterClose);
  const adRef = useRef<RewardedAd | null>(null);
  const loadedRef = useRef(false);
  const showingRef = useRef(false);
  const earnedRef = useRef<RewardedAdReward | null>(null);

  onRewardRef.current = onRewardAfterClose;

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      setMessage(undefined);
      return;
    }

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

        // Development builds always use Google's official platform test unit ID.
        ad = RewardedAd.createForAdRequest(getRewardedUnitId(), {
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
        removeEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
          if (!active || earnedRef.current) return;
          earnedRef.current = reward;
        });

        removeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
          if (!active) return;
          loadedRef.current = false;
          showingRef.current = false;
          const reward = earnedRef.current;
          earnedRef.current = null;
          if (reward && reward.type && Number.isFinite(reward.amount) && reward.amount > 0) {
            setStatus('idle');
            setMessage(undefined);
            onRewardRef.current(reward);
          } else {
            setStatus('unavailable');
            setMessage('The ad ended before the reward was earned. You can retry normally.');
          }
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
    earnedRef.current = null;
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
      earnedRef.current = null;
    };
  }, [enabled, requestKey]);

  const onPress = useCallback(() => {
    const ad = adRef.current;
    if (!ad || !loadedRef.current || showingRef.current) return;
    showingRef.current = true;
    earnedRef.current = null;
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
