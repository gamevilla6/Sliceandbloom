# Monetization & Ad Nexus

This TypeScript project uses `lib/AdManager.ts` / `AdManager.native.ts` rather
than an untyped AdManager.js. `AdManagerCore.ts` owns the event-driven lifecycle.
There are no ad requests, timers or SDK calls inside the Matter.js frame loop.

## Configuration

The Expo Google Mobile Ads config plugin in `app.json` already contains the
supplied **Android** App ID. All three production Android ad units are in
`lib/adConfig.ts`, including the interstitial ending `/5016456636`.

Native development builds always select Google's official `TestIds.BANNER`,
`TestIds.INTERSTITIAL` and `TestIds.REWARDED`. Never test live ads by clicking
them. The iOS App ID remains Google's test App ID; real iOS publishing requires
a separate iOS App ID and iOS ad units. Do not reuse Android IDs on iOS.
The existing `react-native-google-mobile-ads` package/config plugin is used;
no new package installation is required. Changes to native configuration require
a new Expo development/release build, not just an OTA JavaScript update.
Expo Go and the browser cannot run the native SDK. Web never simulates ads or
grants a reward for an unavailable video.

## Lifecycle

`app/_layout.tsx` calls `initializeAds()` at startup. Native SDK initialization
and UMP consent are shared by banners, rewarded and interstitials. Ad loading is
asynchronous, single-flight per format, and guarded against stale callbacks.
Loaded ads refresh before the one-hour cache expiry; background load errors use
bounded backoff and a 15-second load timeout. Returning to the app refreshes stale
ads. No ad auto-shows on launch, return from the background, timer expiry or load.
One fullscreen lock prevents rewarded and interstitial ads overlapping.

## Placements

- **Main menu, every mode's level grid, Reward Hub and result cards:** native
  anchored-adaptive banners have a separate safe-area dock. They resize on
  rotation and release their reserved space if unavailable.
- **Gameplay:** no banner, including while the droplet is held and the player is
  drawing. Menus pause the existing world rather than resetting its geometry.
- **Interstitial:** successful attempts across all modes increment a persisted
  counter, once per session/attempt ID. Only wins 3, 6, 9, etc. create an
  opportunity. On Next, Replay or Levels from that victory card, a ready ad can
  show before continuing. If loading, unavailable, stale, backgrounded or another
  fullscreen ad is active, the opportunity is skipped immediately—never deferred
  into gameplay or a later non-milestone win. Failures, skips, browsing grids and
  app launch do not trigger interstitials. A storage error skips forced ads.
- **Rewarded:** opt-in only, for useful +50% ink retries/revivals, hints and the
  existing daily/vault/wheel/fast-pass offerings. A cached video can show on the
  first explicit Watch tap. If not cached, Load then Watch remains available.
  Ink offers are hidden on slice-only/no-ink stages rather than promising an
  unusable refill. Normal retry always remains free.

Only `EARNED_REWARD` followed by `CLOSED` calls the selected reward callback.
The daily offering is captured at Watch, so crossing midnight during a video
does not replace an advertised Day 7 pass with a different day's prize.
Closing early, duplicate events, load/show errors and stale callbacks cannot
grant inventory. Profile receipts still make Hub credits idempotent. See
`docs/reward-hub.md` for item rules, disclosed random odds and local-storage limits.

## Verification before Android release

Run `pnpm --filter @workspace/cloud-garden run validate`.
The SDK-independent tests simulate native event ordering, no-fill, cache expiry,
show failures, foreground/background, duplicate callbacks, reward gating and
third-win cadence; they are not fake-ad features shipped in the browser.

On a real Android development build, verify Google's TEST banners in each menu
and both orientations, no banner/touch overlap, TEST interstitials only after
the third/sixth real win and an explicit result transition, full watched video
plus close granting once, early close granting nothing, no-fill/offline fallback,
consent choices and foreground/resume. Repeat on compact/notched phones/tablet.
Actual native SDK display and 60 FPS on physical devices cannot be certified by
browser testing. Earnings, fill rates, eCPM and zero-lag rendering are not
guaranteed; monitor real device performance and AdMob reports.
