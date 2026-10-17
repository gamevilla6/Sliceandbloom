import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';
import { getBannerUnitId, initializeBannerSdk } from '@/lib/AdManager';
import {
  BANNER_AD_RESERVED_HEIGHT,
  type BannerAdComponentProps,
} from './BannerAdComponent';

/** Native-only adaptive banner; debug builds always use Google's test unit. */
export function BannerAdComponent({ onHeightChange }: BannerAdComponentProps = {}) {
  const { width } = useWindowDimensions();
  const [sdkReady, setSdkReady] = useState(false);
  const [height, setHeight] = useState(BANNER_AD_RESERVED_HEIGHT);
  const [hidden, setHidden] = useState(false);
  const unitId = getBannerUnitId();

  useEffect(() => {
    let active = true;
    setHidden(false);
    setSdkReady(false);
    setHeight(BANNER_AD_RESERVED_HEIGHT);
    onHeightChange?.(BANNER_AD_RESERVED_HEIGHT);
    if (!unitId) {
      setHidden(true);
      onHeightChange?.(0);
      return () => { active = false; };
    }

    initializeBannerSdk()
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
  }, [unitId, onHeightChange, width]);

  if (hidden) return null;

  return (
    <View style={[styles.slot, { height }]}>
      {sdkReady && unitId && (
        <BannerAd
          key={`${unitId}:${Math.round(width)}`}
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
