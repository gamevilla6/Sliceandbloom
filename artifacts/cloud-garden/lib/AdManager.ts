import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdManagerCore } from './AdManagerCore';

/** Browser fallback: no mock impressions, no simulated rewarded grants. */
export const adManager = new AdManagerCore(null, AsyncStorage);
export const initializeAds = () => adManager.start();
export const initializeBannerSdk = async () => {};
export function getBannerUnitId(): string | undefined { return undefined; }
