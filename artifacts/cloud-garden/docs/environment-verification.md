# Slice & Bloom — source and build verification

Verification date: October 19, 2026.

Historical snapshot: the persistence fix made after this report changes runtime
source. APKs and ZIPs delivered before that fix do not contain it. A fresh QA APK
has now been built; see `android-persistence-build.md` for its fingerprint and
verification. This older report is not validation of a signed production AAB.

## Source and published application

- Replit's deployment service identifies the active public application as
  https://cloud-to-plant-physics-puzzle.replit.app.
- Its root and referenced application JavaScript returned HTTP 200. The title is
  "Slice & Bloom — Play the Physics Puzzle".
- The public application bundle contains Game Villa and
  `contact.gamevilla@gmail.com`, not the superseded support addresses.
- A public deployment contains compiled browser output, not an editable Expo
  checkout, native project, or signing credentials. No workspace files were
  overwritten with minified browser output.
- The published bundle and the local browser export have different fingerprints;
  this check does not establish that they came from the same source revision.
- All 73 files compared under the workspace app's app, components, lib, hooks,
  constants and assets directories match the preserved native APK build source.
  This comparison does not include arbitrary files elsewhere in the monorepo.

## Responsive rendering and physics

- The shared layout hook uses `useWindowDimensions()` and actual safe-area insets.
- The game surface uses `flex: 1`, full width, and measured layout dimensions.
- Matter.js retains invariant logical coordinates. Uniform rendering scale fits
  the whole level without distorting physics, and touch coordinates use the
  inverse transform. Fitting can leave background margins on mismatched aspect
  ratios; it does not crop levels to fill the screen.
- The mode menu was visually checked at 360 × 800 and 1024 × 768. A cold preview
  capture preceded font loading; the subsequent mobile capture rendered.
- Earlier automated geometry and physics checks remain applicable to the
  unchanged runtime source. This is not a physical-device or universal-screen
  certification.

## Native advertising

- Installed wrapper: react-native-google-mobile-ads 17.2.0.
- App ID: `ca-app-pub-3691647720194867~6693245246`. This also appears in the
  built QA APK's inspected manifest.
- Production rewarded unit: `ca-app-pub-3691647720194867/7981531326`.
- Consent is gathered before SDK initialization. Rewarded ads are preloaded.
- The adapter handles `RewardedAdEventType.EARNED_REWARD`. The shared manager
  grants once only after an earned event followed by ad closure.
- The hint reward closes the prompt and reveals the ghost-line guide. Physics
  is paused while the prompt or fullscreen ad is active.
- Early closure and ad errors do not grant rewards. Loading failures leave
  normal gameplay available.
- QA uses official Google test ad units; production configuration selects live
  Android units. Native AdMob is intentionally unavailable in the web build.
- Publisher-account activation, actual ad fill and native-device rewarded
  playback have not been verified. Configured IDs alone cannot prove those.

## Branding and build profiles

- App: Slice & Bloom; studio: Game Villa.
- Store package: `com.gamevilla.sliceandbloom`.
- Support: `contact.gamevilla@gmail.com`.
- Version: 1.0.0, version code 1.
- GAME MOOD main icon: 297,803 bytes; adaptive foreground: 322,212 bytes.
- Adaptive background: `#1E293B`.
- Development and preview/testing profiles select APK output and test ads.
- Production selects AAB output, live ads, and existing remote-managed signing.
  Signing credentials were not read, reset or replaced.
- Expo prebuild added duplicate Expo/React/React Native declarations to the
  disposable QA package manifest. Those declarations already exist in the
  workspace's development dependencies; effective requested versions match.

## Available artifacts and remaining release requirements

- Fresh QA APK: `SliceAndBloom-debug-test.apk`.
- QA identity: `com.gamevilla.sliceandbloom.preview`, public Android debug signing.
- APK signature, zip alignment, checksums and testing-ZIP integrity passed.
- No signed production AAB is available. The last production build request
  stopped before signing with "No repository found for appId".
- Required Expo project: `e20e9de1-ea5b-4b14-93e4-4d42ba186d5f`.
- Required repository: `mobigadgets10-bit/Sliceandbloom`, branch `Main`,
  base directory `artifacts/cloud-garden`. The available Expo connection cannot
  edit this dashboard repository association.
- The full four-file deployment ZIP must wait for the genuine signed AAB.
  A debug APK must not be renamed or substituted for it.
- Physical-device QA, accurate Play declarations and unresolved licensing/notice
  requirements remain. See `copyright-and-play-audit.md`. This report is not
  legal clearance, a Play approval, or a guarantee of error-free operation.
