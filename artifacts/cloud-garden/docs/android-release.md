# Slice & Bloom — Android / Google Play release

## Configured identity

- Package / application ID: `com.gogoldatta.sliceandbloom`
- First release: version name `1.0.0`, Android version code `1`
- Existing `cloud-garden` Expo slug and deep-link scheme are preserved.
- Store profile: signed Android App Bundle (`.aab`), not an APK or dev client.

The package ID becomes the permanent identity of the Google Play app. This
configuration does not reserve the ID or verify its availability in Play Console.
Do not change it after the first upload unless you intend to create another app.

## 1. Local checks

Run commands from the app directory, **not the repository root**:

```sh
cd artifacts/cloud-garden
pnpm install --frozen-lockfile
pnpm run release:check
pnpm run release:manifest
pnpm run validate
CI=1 pnpm exec expo install --check
```

This is a pnpm monorepo. Keep its root `package.json`, `pnpm-workspace.yaml`,
`pnpm-lock.yaml` and shared workspace libraries when exporting or cloning it.
EAS uses Node 24.13.0 and Corepack with the pinned pnpm version. Do not set
`NODE_ENV=production` during dependency installation: this template has Expo
build tooling in devDependencies. Expo's release bundling sets `__DEV__=false`.

## 2. Link your own Expo/EAS account

```sh
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest whoami
pnpm dlx eas-cli@latest init
```

Select/create the project in your own account. EAS writes the real
`extra.eas.projectId` into app.json; no placeholder account or UUID is included.
Review and commit that change. No Expo token, Google key or signing credential
belongs in this repository or chat. Account linking is a one-time prerequisite,
not something this setup has performed on your behalf.

## 3. Test on Android safely first

```sh
pnpm dlx eas-cli@latest build --platform android --profile preview
```

This generates an installable release-mode **APK with Google test ads**. For
Metro development, use `--profile development` instead and connect your dev
client to Metro. Google Mobile Ads cannot run in Expo Go or the web preview.

Check launch/splash, launcher icon masks and themed icon, all mode menus, drawing,
sound, background/foreground, rotation and saved progress on a physical device.
Verify earned-and-closed rewards exactly once, early-close/error/no-fill with no
grant, normal free retries and interstitials only at eligible post-win breaks.
Do not click live ads or repeatedly watch them to test your own production app.

## 4. Build the production AAB

```sh
pnpm run release:check
pnpm dlx eas-cli@latest build --platform android --profile production
```

When EAS asks for Android signing, let it generate/manage the upload keystore
unless you already have the correct upload key for this Play app. Use that same
key for future uploads, enable Play App Signing, and keep a secure backup through
your EAS account. Do not generate a new upload identity for every update.

The completed EAS build page provides the signed `.aab` download. An AAB is for
Google Play; it cannot be installed like an APK. A successful EAS/Gradle build is
still required: local config checks do **not** prove native compilation or Play
approval. This setup has not generated, signed or uploaded a bundle.

## 5. Google Play Console

Create the app in your Google Play developer account and upload the AAB to an
internal test release. Complete the listing, required screenshots/graphics,
contact information, content rating, target audience, ads declaration, privacy
policy URL and Data safety form. The code's launcher PNG is not a substitute for
every store-listing asset. Review the currently enforced target API/SDK and
testing requirements shown in Play Console before submitting.

Declare advertising ID use consistently with the Google Mobile Ads SDK and the
audience you select. Non-personalized ads do **not** mean no SDK data collection.
Configure/review AdMob privacy messages and consent settings in your account.
The existing in-app privacy-options work remains a separate release checklist
item; do not treat this build configuration as legal/policy approval.

Optional EAS Submit after configuring its required Google Play access in your
own accounts:

```sh
pnpm dlx eas-cli@latest submit --platform android --profile production --latest
```

The included submit profile targets **internal / draft**, not a public rollout.
Uploading via Play Console manually is also supported. Do not paste service
account JSON or keystores into chat or commit them.

## Live AdMob configuration

| Format | Android production ID |
|---|---|
| App | `ca-app-pub-3691647720194867~6693245246` |
| Banner | `ca-app-pub-3691647720194867/1485150592` |
| Interstitial | `ca-app-pub-3691647720194867/5016456636` |
| Rewarded | `ca-app-pub-3691647720194867/7981531326` |

The supported Google Mobile Ads config plugin inserts the App ID into the native
manifest. Production has `EXPO_PUBLIC_ADMOB_TEST_ADS=false`; the release JS build
uses the live IDs. Preview/development use `true` and official SDK `TestIds`.
The post-install guard rejects conflicting EAS profile/environment ad flags.
No test-device override is configured. iOS still requires its own production IDs.
Native config changes require a new binary, not just a JavaScript update.

## Versions, permissions and images

Versioning is intentionally **local/manual** so the first build stays at code 1.
For each later upload, increment `expo.android.versionCode` in app.json (2, 3…);
change `expo.version` when publishing a new user-facing version. Re-uploading a
version code already used in Play Console will be rejected.

Internet, network state and advertising ID are explicitly declared. Unused
draw-over-apps, camera, location, storage/media and microphone permissions are blocked at
manifest merge; audio is playback-only with no background service. Recheck the
final merged manifest from the EAS build before shipping any new native module.

The original 1024px brand icon remains the legacy launcher/web icon. Transparent
adaptive and monochrome masks use padded artwork inside Android's safe zone.
The modern expo-splash-screen plugin uses the same centered transparent logo
on the cream background. These assets are committed; EAS does not need
ImageMagick. If changing the source icon, regenerate locally with ImageMagick:

```sh
pnpm run release:assets
pnpm run release:check
```

Official references:
- https://docs.expo.dev/build-reference/build-with-monorepos/
- https://docs.expo.dev/build/eas-json/
- https://docs.expo.dev/build-reference/app-versions/
- https://docs.expo.dev/submit/android/
