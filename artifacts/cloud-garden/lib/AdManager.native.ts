import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import mobileAds, { AdsConsent, AdEventType, InterstitialAd, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { AdManagerCore, type AdAdapter, type AdPort } from './AdManagerCore';
import { ANDROID_AD_UNITS } from './adConfig';

let initialization: Promise<unknown> | undefined;
function initializeSdk() {
  if (!initialization) initialization = (async () => {
    const consent = await AdsConsent.gatherConsent();
    if (!consent.canRequestAds) throw new Error('Consent does not permit ad requests.');
    return mobileAds().initialize();
  })().catch(error => { initialization = undefined; throw error; });
  return initialization;
}
function unitId(kind: keyof typeof ANDROID_AD_UNITS) {
  if (__DEV__) return { banner: TestIds.BANNER, rewarded: TestIds.REWARDED, interstitial: TestIds.INTERSTITIAL }[kind];
  if (Platform.OS === 'android') return ANDROID_AD_UNITS[kind];
  return { banner: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
    rewarded: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
    interstitial: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS }[kind];
}
const adapter: AdAdapter = {
  initialize: initializeSdk,
  create(kind): AdPort {
    const id = unitId(kind);
    if (!id) throw new Error(`No ${kind} production unit configured for ${Platform.OS}.`);
    const options = { requestNonPersonalizedAdsOnly: true };
    if (kind === 'rewarded') {
      const ad = RewardedAd.createForAdRequest(id, options);
      return {
        load: () => ad.load(), show: () => ad.show(),
        destroy: () => { ad.removeAllListeners(); ad.destroy(); },
        on: (event, callback) => event === 'earned'
          ? ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => callback(reward))
          : event === 'loaded' ? ad.addAdEventListener(RewardedAdEventType.LOADED, () => callback())
            : ad.addAdEventListener(event === 'closed' ? AdEventType.CLOSED : AdEventType.ERROR, () => callback()),
      };
    }
    const ad = InterstitialAd.createForAdRequest(id, options);
    return {
      load: () => ad.load(), show: () => ad.show(),
      destroy: () => { ad.removeAllListeners(); ad.destroy(); },
      on: (event, callback) => event === 'earned' ? () => {}
        : ad.addAdEventListener(event === 'loaded' ? AdEventType.LOADED : event === 'closed' ? AdEventType.CLOSED : AdEventType.ERROR, () => callback()),
    };
  },
};
export const adManager = new AdManagerCore(adapter, AsyncStorage);
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | undefined;
export async function initializeAds() {
  if (!appStateSubscription) {
    adManager.setAppActive(AppState.currentState === 'active' || AppState.currentState === null);
    appStateSubscription = AppState.addEventListener('change', state => adManager.setAppActive(state === 'active'));
  }
  await adManager.start();
}
/** Banners share the same SDK consent/initialization, IDs and test-mode policy. */
export const getBannerUnitId = () => unitId('banner');
export const initializeBannerSdk = initializeSdk;
