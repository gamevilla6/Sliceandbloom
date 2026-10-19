# Slice & Bloom — persistence-fix Android build

Build date: October 19, 2026.

## Available testing binary

- APK: `SliceAndBloom-debug-test.apk`.
- App label: Slice & Bloom Preview; studio: Game Villa.
- Testing package: `com.gamevilla.sliceandbloom.preview`.
- Production package remains `com.gamevilla.sliceandbloom`.
- Support: `contact.gamevilla@gmail.com`.
- Size: 72,835,671 bytes.
- SHA-256:
  `35e464a960dc6ecdffdeaf9cbd56509852b2e143d1d8f5b7ce20453950b19667`.
- Public Android debug signature verified; this is not store signing.
- Native Gradle `assembleRelease` succeeded in 1 minute 54 seconds.

This is a fresh standalone QA APK, not an Expo Go link or a renamed old build.
Existing generated native projects and compilation caches were reused without
changing the production signing identity.

## Persistence and build verification

- All 75 runtime/asset files copied to the native checkout were compared by
  SHA-256 against the current workspace source.
- The APK's compiled Hermes bundle contains the new load/write failure handling
  and Retry accessibility strings, confirming the persistence change was bundled.
- AsyncStorage 2.2.0 is a production dependency. Its Android native package is
  autolinked and included in the successful build.
- The source passed 963 automated tests, including persistence races, old keys,
  all five mode profiles, reward balances and storage-failure recovery.
- The same unchanged source passed the focused browser persistence test:
  settings and level selection survived reload, records and balances remained,
  and write/load failures recovered using Retry without silent data replacement.
- APK signature verification, ZIP alignment and embedded metadata checks passed.
- All 25 ARM64 shared libraries have ELF load-segment alignment of at least 16 KB.
  This does not constitute Google's examination of a production AAB.

This APK has not been installed and force-closed on a physical Android device
in this verification. Browser tests and native compilation do not substitute for
that test. Storage is per installation: `.preview`, production and browser
profiles are separate. Do not uninstall when testing same-package update saves.

## Layout, ads and branding

Responsive layout and inverse touch scaling are unchanged from the verified
source. Menus were checked at phone and tablet sizes; universal screen/device
correctness is not guaranteed.

The supplied App ID `ca-app-pub-3691647720194867~6693245246` appears in the
native manifest. Production selects rewarded unit
`ca-app-pub-3691647720194867/7981531326`.
The QA build explicitly selects official Google test ads. The hint manager
requires an earned-reward event and ad closure before granting the reward.
Actual native ad playback, publisher activation and live ad fill are unverified.

The GAME MOOD icon and adaptive foreground remain under 1 MB. Production
metadata retains Slice & Bloom / Game Villa and the requested support address.

## Production build blocker

The fresh production request used:

- Expo project `e20e9de1-ea5b-4b14-93e4-4d42ba186d5f`;
- repository `mobigadgets10-bit/Sliceandbloom`;
- reference `Main`;
- base directory `artifacts/cloud-garden`;
- production profile, Android AAB, remote-managed signing, no automatic submission.

Expo rejected it before signing:
`No repository found for appId e20e9de1-ea5b-4b14-93e4-4d42ba186d5f`.
The existing Expo-managed signing key was not read, exported, reset or replaced.
Successful synchronization of the current source to GitHub Main was not
established; remote branch queries returned no branch references.

The repository association and latest source must be established before the
production AAB can be generated. The QA archive intentionally excludes it;
there is no complete APK + signed AAB release ZIP yet.

## Remaining release obligations

See `copyright-and-play-audit.md`. Distribution notices and native SDK terms
remain release obligations; the assets have not received legal/trademark
clearance. Complete accurate privacy, audience, ads and Data safety declarations
in Play Console. No claim of 100% copyright freedom or Play approval is made.
