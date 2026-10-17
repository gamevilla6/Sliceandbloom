/** Public Android publisher identifiers. iOS requires separate production IDs. */
export const ANDROID_ADMOB_APP_ID = 'ca-app-pub-3691647720194867~6693245246';
export const ANDROID_AD_UNITS = {
  banner: 'ca-app-pub-3691647720194867/1485150592',
  interstitial: 'ca-app-pub-3691647720194867/5016456636',
  rewarded: 'ca-app-pub-3691647720194867/7981531326',
} as const;

/** Release preview APKs still need test ads; store builds explicitly opt out. */
export function adsUseTestUnits(development: boolean, testAdsFlag?: string): boolean {
  return development || testAdsFlag === 'true';
}
