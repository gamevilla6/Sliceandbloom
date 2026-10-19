SLICE & BLOOM — ONLINE-ONLY SOURCE / PUBLISHING SETUP
Studio: Game Villa
Production package: com.gamevilla.sliceandbloom
Support: contact.gamevilla@gmail.com

THIS IS NOT A COMPILED RELEASE
No signed production .aab or updated .apk is included. Production signing
access is still unavailable to the local build setup. Do not rename a ZIP,
unsigned bundle or testing APK to represent a signed production AAB.

CONTENTS
privacy_policy.md: internet-only and private, per-installation cloud-save disclosure.
store-listing/: accurate short/full Play descriptions for the 2D game.
online-only-release.md: implemented behavior and release blockers.
source-overlay/: current mobile source, assets, tests and dependency lockfile.
source-fingerprints.json: SHA-256 inventory of the source overlay.
verification.txt: checks completed and remaining native-device checks.

APPLY TO THE EXISTING PROJECT
1. Use the existing full project checkout, not an empty folder. The source
   overlay is not a standalone replacement for the whole monorepo.
2. Preserve a backup/checkpoint of that checkout and merge source-overlay/
   into its root. The mobile app remains at artifacts/cloud-garden.
3. Keep your own environment and secret configuration. None is included here.
4. From the repository root, install the locked dependencies:
      pnpm install --frozen-lockfile
5. Run validation:
      pnpm --filter @workspace/cloud-garden run validate
6. On Replit, use the existing Slice & Bloom Expo preview workflow.

PRODUCTION BUILD REQUIREMENTS
Project: e20e9de1-ea5b-4b14-93e4-4d42ba186d5f
Expected repository: mobigadgets10-bit/Sliceandbloom
Branch: Main
Base directory: artifacts/cloud-garden
Profile: production
Signing: existing Expo-managed remote keystore, unchanged.
Output required: signed Android App Bundle for com.gamevilla.sliceandbloom.

Authorize the production build through the existing Expo project and resolve
its source-repository association before retrying that managed build route.
The preserved local native checkout is .preview/debug QA, NOT production.
Do not use that checkout or key for a store submission.

NetInfo is a native dependency. Build a fresh native binary that includes it;
older testing APKs predate this online-only change. A JS-only update to a
binary without the new native module is not sufficient.

AFTER A SIGNED AAB IS AVAILABLE
1. Verify package, version, upload certificate and native module registration.
2. Test a fresh installed launch with airplane mode enabled: gameplay must
   stay blocked with the internet-required message and Retry.
3. Test captive Wi-Fi, Wi-Fi/cellular handoffs, background/foreground resume,
   and connection loss during active puzzles, including timed modes.
4. Reconnect: the same puzzle and locally saved progress should remain.
5. Test rewarded hints with official Google test ads in a QA build. Confirm
   only an earned reward followed by ad close grants the hint, exactly once.
6. Check live production IDs only in the production configuration. Ad fill
   is not guaranteed by an active internet connection.
7. Host/review the privacy policy and complete Play Console Data safety and
   listing declarations against actual SDK behavior.
8. Upload the production AAB to the appropriate Play Console testing track.
   Do not uninstall an existing game to test update persistence.

SAVE BEHAVIOR
Level unlocks, stars, high scores and best times are cached in AsyncStorage and
synced to a private cloud record for this installation. The anonymous bearer
token stays in Expo SecureStore on Android/iOS. No account or public leaderboard
is used; saves do not move between devices. Settings and rewarded-ad inventory
remain device-local. Losing the network pauses play and keeps the local cache.
Clearing secure storage makes an existing cloud record inaccessible; the Privacy
page displays an installation ID for a deletion request. Privacy remains
accessible while offline.

API AND DATABASE
The mobile app calls the API at
https://cloud-to-plant-physics-puzzle.replit.app/api. New development tables
must be applied to the development database with the workspace Drizzle push.
Production schema changes take effect through Replit Publish. Do not run a
production database push from the development workspace.
