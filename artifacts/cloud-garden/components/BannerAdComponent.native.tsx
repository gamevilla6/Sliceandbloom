import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';
import { initializeRewardedAds } from '@/lib/rewardedAds';
import {
  BANNER_AD_RESERVED_HEIGHT,
  type BannerAdComponentProps,
} from './BannerAdComponent';

function getBannerUnitId(): string | undefined {
  if (__DEV__) return TestIds.BANNER;
  return Platform.select({
    android: 'ca-app-pub-3691647720194867/1485150592',
    ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
  });
}

/** Native-only adaptive banner; debug builds always use Google's test unit. */
export function BannerAdComponent({ onHeightChange }: BannerAdComponentProps = {}) {
  const [sdkReady, setSdkReady] = useState(false);
  const [height, setHeight] = useState(BANNER_AD_RESERVED_HEIGHT);
  const [hidden, setHidden] = useState(false);
  const unitId = getBannerUnitId();

  useEffect(() => {
    let active = true;
    if (!unitId) {
      setHidden(true);
      onHeightChange?.(0);
      return () => { active = false; };
    }

    initializeRewardedAds()
      .then(() => {
        if (active) setSdkReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setHidden(true);
        onHeightChange?.(0);
        console.warn('[ads] Banner SDK initialization failed.', error);
      });

    return () => { active = false; };
  }, [unitId, onHeightChange]);

  if (hidden) return null;

  return (
    <View style={[styles.slot, { height }]}>
      {sdkReady && unitId && (
        <BannerAd
          unitId={unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdLoaded={({ height: loadedHeight }) => {
            setHeight(loadedHeight);
            onHeightChange?.(loadedHeight);
          }}
          onAdFailedToLoad={(error) => {
            setHidden(true);
            onHeightChange?.(0);
            console.warn('[ads] Banner ad failed to load.', error);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
