# Online-only release setup

Brand: Game Villa  
Application: Slice & Bloom  
Production package: `com.gamevilla.sliceandbloom`  
Support: `contact.gamevilla@gmail.com`

## Implemented

- NetInfo 12.0.1, matching the installed Expo SDK's bundled-native-module map,
  is a production dependency. Existing INTERNET and ACCESS_NETWORK_STATE
  permissions remain configured.
- A fail-closed launch gate verifies an actual HTTP response. Native builds
  require Google's connectivity endpoint to return 204; web builds check their
  current host with a noncached HEAD request. Captive redirects, failed requests
  and timeouts block play.
- Connection events, foreground resumes and 15-second active-app checks
  detect loss. Level selection, free retry and Continue also await a new check.
- Physics pauses without recreating the world. Offline automatic retries stop,
  and the blocking dialog cannot be dismissed to play. Retry checks again.
- Privacy remains accessible while offline. Its route does not advance hidden
  gameplay. Existing AsyncStorage keys and stored progress are unchanged.
- Ads cannot preload/show while the manager is offline. Reconnection retries
  preloads, and native banners wait for online verification. SDK-earned rewards
  still wait for ad close; disconnecting does not fabricate or erase a receipt.
- Progress remains device-local, as requested. No cloud sync, online leaderboard,
  daily online seeds or 3D gameplay are advertised.

## Production build status

No signed production AAB has been generated for this update. The production
profile still uses the existing Expo-managed remote keystore, but that key is
not available to the local Android build setup. The preserved local native
checkout is debug-signed QA with the `.preview` package, NOT production.

The previous managed build request was rejected because Expo did not find a
repository for project `e20e9de1-ea5b-4b14-93e4-4d42ba186d5f`. Its expected source is
`mobigadgets10-bit/Sliceandbloom`, branch `Main`, base `artifacts/cloud-garden`.
No fresh production request or signing-key reset is performed for this change.

The setup archive deliberately excludes an AAB rather than substituting an
unsigned or debug-signed file. Existing testing APK downloads predate this
online-only update. A fresh native binary is required to include NetInfo;
do not deliver this as a JavaScript-only update to an incompatible old binary.

## Publishing checks

1. Synchronize the current source and lockfile to the intended repository.
2. Establish authorized production signing through the existing Expo project.
   Preserve the current upload key; do not replace it with the QA debug key.
3. Build the production app-bundle profile with live AdMob IDs and verify its
   package, version, certificate, native dependencies and bundled assets.
4. Test cold launch without internet, captive Wi-Fi, Wi-Fi/cellular handoffs,
   foreground resume and loss during a timed puzzle or rewarded ad.
5. Confirm local saves persist after force-close/reopen and after updating an
   existing same-package installation. Do not uninstall to test persistence.
6. Use the accurate store descriptions and updated privacy policy. Reconcile
   the Play Console Data safety form with SDK behavior before submission.
