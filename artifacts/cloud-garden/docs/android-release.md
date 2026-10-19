# Slice & Bloom — Android / Google Play release

## Configured identity

- Developer branding: **Game Villa**
- Public support email: `contact.gamevilla@gmail.com` (also shown in Settings and the Privacy page)
- Package / application ID and iOS bundle identifier: `com.gamevilla.sliceandbloom`
- First release: version name `1.0.0`, Android version code `1`
- Expo slug: `slice-and-bloom`; the existing `cloud-garden` deep-link scheme is preserved.
- Store profile: signed Android App Bundle (`.aab`), not an APK or dev client.

The package ID becomes the permanent identity of the Google Play app. This
configuration does not reserve the ID or verify its availability in Play Console.
Do not change it after the first upload unless you intend to create another app.

The Game Villa namespace is a separate application from builds using the
previous developer namespace: those installed apps cannot receive it as an
in-place update, and their private local saves do not migrate automatically.
Previously exported APK/AAB files are not renamed by source configuration
changes; rebuild before distributing the new identity.

All `eas.json` build profiles inherit the package and bundle identifiers from
`app.json`. The linked Expo project and remote signing configuration remain
unchanged; verify signing credentials for the new package before a store build.
The Expo `owner` is an authenticated account/team identifier, not a display
credit. Changing developer branding here does not rename the account or the
developer display name in Google Play Console / App Store Connect.

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

## 2. Review the linked Expo project

Keep the existing `extra.eas.projectId` in `app.json`. In your Expo account,
verify that you can access that project and that its connected repository and
branch contain the latest Game Villa source. The app directory for this
monorepo is `artifacts/cloud-garden`, not the repository root.

The local checks do not authenticate your Expo account or verify remote
credentials. No Expo token, Google key or signing credential belongs in this
repository or chat. Do not replace the project link or account owner merely
to change the studio display name.

## 3. Test on Android safely first

For an Android build from the connected repository in your Expo project's
build dashboard, choose the **testing** profile from this app's `eas.json`
(`preview` remains a compatible alias).
It is configured for an installable release-mode **APK with Google test ads**.
The **development** profile instead includes a dev client that connects to
Metro. Google Mobile Ads cannot run in Expo Go or the web preview.

Check launch/splash, launcher icon masks and themed icon, all mode menus, drawing,
sound, background/foreground, rotation and saved progress on a physical device.
Verify earned-and-closed rewards exactly once, early-close/error/no-fill with no
grant, normal free retries and interstitials only at eligible post-win breaks.
Do not click live ads or repeatedly watch them to test your own production app.

## 4. Build the production AAB

In the same external Expo build dashboard, select Android and the **production**
profile. Review the build context and branch before starting. This profile is
configured for `distribution: "store"`, `android.buildType: "app-bundle"`,
remote signing, version `1.0.0` / code `1`, and production ad units. It does not
increment the first-upload version code automatically.

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

The app includes **Settings → Privacy policy** and a web route at `/privacy`.
Publish the web version before submitting its full HTTPS URL as the Play Console
privacy-policy link, and confirm the page is publicly reachable.

Use **Game Villa** as the intended developer brand and
`contact.gamevilla@gmail.com` for the public support contact. Set these explicitly
in Play Console as well: changing app metadata does not update your account or
store listing automatically.

Declare advertising ID use consistently with the Google Mobile Ads SDK and the
audience you select. Non-personalized ads do **not** mean no SDK data collection.
Configure/review AdMob privacy messages and consent settings in your account.
The existing in-app privacy-options work remains a separate release checklist
item; do not treat this build configuration as legal/policy approval.

Download the completed signed AAB from the build dashboard and upload it in
Play Console. The included optional submit profile targets **internal / draft**,
not a public rollout, and does not itself authenticate or upload anything.
Do not paste service account JSON or keystores into chat or commit them.

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

The store release uses the **production** profile, which emits a signed AAB
with production ad units. For installable gameplay QA, use the **preview**
profile; it emits a separate APK with official test ad units. Do not use the
development-client APK as the standalone QA deliverable.

After collecting both fresh build outputs, place them in
`generated-artifacts/android/` as `slice-and-bloom-preview.apk` and
`slice-and-bloom-production.aab`. Keep the APK inspection reports
(`package.txt` and `signature.txt`) alongside them, then run:

```sh
pnpm run release:package
```

The packaging script refuses to make the ZIP if either binary is missing, the
APK is not the isolated debug-signed preview, or the AAB lacks its bundle
signature files. The resulting ZIP includes both binaries, `privacy_policy.md`,
and a generated `README.txt`. The script packages binaries; it does not compile
or sign them.

Official references:
- https://docs.expo.dev/build-reference/build-with-monorepos/
- https://docs.expo.dev/build/eas-json/
- https://docs.expo.dev/build-reference/app-versions/
- https://docs.expo.dev/submit/android/
