# Rewarded AdMob retry

Slice & Bloom offers one optional rewarded retry on the standard campaign's failure card. Google Mobile Ads grants it only after the rewarded-ad earned-reward event; loading, showing, closing early, or an error never retries the level. The ordinary Retry button always remains available.

## Included setup

- `react-native-google-mobile-ads` is configured through its Expo config plugin.
- The app runs Google's UMP consent flow first, then initializes the Google Mobile Ads SDK once at startup only when `canRequestAds` is true.
- The Android App ID in `app.json` is the one supplied for this app. iOS retains Google's test App ID until an iOS App ID is provided:
  - Android: `ca-app-pub-3691647720194867~6693245246`
  - iOS: `ca-app-pub-3940256099942544~1458002511`
- Debug builds use Google's official test rewarded unit IDs:
  - Android: `ca-app-pub-3940256099942544/5224354917`
  - iOS: `ca-app-pub-3940256099942544/1712485313`
- Android release builds use the supplied rewarded unit: `ca-app-pub-3691647720194867/7981531326`. iOS release builds remain disabled until `EXPO_PUBLIC_ADMOB_REWARDED_IOS` and a real iOS App ID are provided.

Google's test rewarded unit IDs are for testing only and are safe for repeated development testing. Do not click or encourage clicks on live ads during development.

## Run on a device

This native module does not run in Expo Go. Install/build a custom native development client (the app includes `expo-dev-client`) or use the supported native app build flow. Adding or changing native modules or the plugin requires a new native build; restarting Metro alone does not add the native SDK to an already-installed app.

After building, launch the app on an iOS or Android device and fail a regular Campaign level. The failure card should offer **Watch ad · Earn a retry** after the test ad loads. If the ad cannot load or show, the normal Retry button still works and no rewarded retry is issued.

## Before release

1. The Android app and rewarded unit IDs are already configured. Before enabling iOS release ads, add the iOS App ID to the Expo plugin options and set `EXPO_PUBLIC_ADMOB_REWARDED_IOS` to the iOS rewarded unit ID.
2. Development builds (`__DEV__`) continue to use `TestIds.REWARDED`; release builds fail closed and offer the ordinary Retry button if a platform's production ID is missing.
3. Add the required privacy disclosures, privacy-policy link, and a settings entry point for UMP privacy choices when the AdMob privacy-options requirement calls for one. The current ad request is non-personalized, but that does not replace applicable consent or store disclosure requirements.
4. Test no-fill, load errors, early close, and completed reward with test ads before enabling real inventory.

Never grant currency or unlocks from `LOADED`, `CLOSED`, or the return value of `show()`. Put all reward-granting logic inside the `RewardedAdEventType.EARNED_REWARD` listener.
