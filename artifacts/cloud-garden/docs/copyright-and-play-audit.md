# Slice & Bloom — copyright, licensing and Play release audit

Audit date: October 18, 2026  
Developer brand: Game Villa  
Android package: com.gamevilla.sliceandbloom

## Verdict

**Audit completed, but this is not a 100% copyright-free certificate or a Google
Play compliance approval.** No obvious copied character, entertainment franchise
logo, branded stock artwork or externally streamed music was identified in the
reviewed game assets/code. Important evidence and release obligations remain.

Copyrighted material can be legally used under a license. MIT, Apache, BSD and
SIL OFL software/fonts are not “copyright-free”; their license conditions still
apply. AI generation and an absence of recognizable logos do not prove
non-infringement. This technical review is not a trademark/patent search, legal
opinion, plagiarism search, or Google's review of the final app.

## Scope and method

- Inventoried all 11 files under the mobile app's `assets/` directory.
- Visually inspected all four PNG files, including icon/adaptive/monochrome art.
- Scanned application source, components, libraries, configuration and server
  templates for asset imports, external URLs, branding, attribution and placeholders.
- Examined the local sound hook and synthesized-audio source; regenerated and
  byte-compared all seven audio effects.
- Inspected all 50 direct dependency declarations, including development tools.
- Exported 548 installed dependency license records from the app-filtered pnpm
  report, including development/build dependencies.
- Ran workspace dependency, static-code and privacy-dataflow scanners.
- Reviewed file-serving guards and ran all five web-hosting regression tests.
- Consulted Google's official Intellectual Property, Advertising ID and app-review
  declaration guidance.

`licensing-inventory.json` records the exact asset SHA-256 hashes, dependency
versions, declared licenses and available top-level notice-file names. It is an
evidence snapshot, not bundled attribution or proof of ownership.

Out of scope: the separate promo film and canvas sandbox, store screenshots not
in the mobile app, and inspection of a newly built signed APK/AAB. Native
Maven/CocoaPods dependencies and final merged permissions must be reviewed from
that release build; npm metadata alone does not cover them.

## Graphics and visual assets

| File | Finding |
| --- | --- |
| assets/images/icon.png | Custom Game Mood droplet/flower art generated earlier in this project. No recognizable external logo or character identified visually. Retain the original generation/source record and applicable service terms. |
| assets/images/adaptive-icon.png | Foreground derivative of the same custom icon family. |
| assets/images/monochrome-icon.png | Monochrome derivative of the same custom icon family. |
| assets/images/garden-icon.png | Legacy generic droplet/flower icon. No live app/config reference was found. A separate creation/license record was not retained; ownership is not independently verified. |

The splash configuration reuses the adaptive icon; no separate splash artwork
is loaded. Game droplet, flowers, obstacles, effects and mode scenery are built
from programmatic SVG shapes/gradients. This describes their implementation,
not a guarantee that their visual appearance is legally exclusive.

The launcher artwork says **GAME MOOD**, while the app title is **Slice & Bloom**
and the studio is **Game Villa**. This was previously requested branding, not an
identified infringement. Review consistency before preparing the store listing.
The names Game Villa, Game Mood and Slice & Bloom have not received trademark
clearance in this audit.

### Third-party visual resources

The game is not made entirely from first-party artwork: it uses licensed Fredoka
fonts and Ionicons/Feather interface icons. Those are legitimate third-party
resources, not assets that should be relabeled as original. Inter is also an
installed font package, though the app layout imports Fredoka.

- Fredoka/Inter packages declare MIT AND OFL-1.1; the actual font files use SIL OFL.
- The icon wrapper and vendored vector-icon code include MIT notices.
- Preserve the applicable font/icon copyright and license notices in distribution.
- If additional icon sets are shipped by the final bundle, inspect their own
  licenses too; a wrapper's MIT license is not blanket clearance for every font.

## Audio and music

Seven short mono PCM WAV effects are loaded locally; no background music,
streamed tracks, Freesound downloads or other external audio URLs were identified.

The existing `impact.wav`, `lose.wav`, and `gravity.wav` matched the retained
synthesis script byte-for-byte. Four older clips (`wood`, `rope`, `splash`, `drop`)
had no retained generation or license evidence, so they were replaced during
this audit with newly written oscillator/seeded-noise synthesis.

**All seven shipped WAV files now reproduce exactly from
`scripts/generate-hardcore-audio.py`.** They use no recordings, samples, network
access or third-party audio library. They retain the existing filenames, mono
22,050 Hz / 16-bit format and short durations. The original three were unchanged.
The four replacement effects will sound different from the older versions.

Verification:

    python3 scripts/generate-hardcore-audio.py --check

These are original project-generated sounds, not a claim that every project
asset or the game's source has been dedicated to CC0/public domain.

## Libraries and commercial-use review

| Component | Declared license / qualification |
| --- | --- |
| React, React Native, Expo, Matter.js, react-native-svg | MIT: commercial use permitted subject to the license, including notice retention. |
| React Native Google Mobile Ads wrapper | Apache-2.0: commercial use permitted subject to its conditions. |
| Google Mobile Ads / UMP native SDKs | Separate Google SDK/service terms; not established as open-source by the wrapper's Apache license. |
| Fredoka / Inter | MIT wrapper plus SIL OFL font conditions. |
| Other installed packages | Predominantly MIT/ISC/BSD/Apache; see the exact inventory. |
| lightningcss and its Linux native package | MPL-2.0; review file-level source/notice obligations if distributed or modified. Not a blanket prohibition on commercial use. |
| caniuse-lite | CC-BY-4.0 data; attribution obligations apply when distributed. |
| node-forge | BSD-3-Clause OR GPL-2.0; a permissive BSD licensing option is available. Retain its required notices rather than assuming everything is MIT. |
| create-launch | Development launcher has no declared license or top-level license file in the installed package. Vendor/tooling terms need confirmation; no game-source import was found. |
| @workspace/api-client-react | First-party internal/generated workspace code; absent package license metadata is not evidence of a third-party license grant. |

No non-commercial-only license was found in the exported metadata. This is
**not** confirmation that every installed package is fully open-source or that
all commercial conditions are already satisfied.

### Release blocker: distribution notices

No in-app open-source notices screen or complete bundled third-party notice
collection was found. Copying npm packages into `node_modules` is not sufficient
proof that a Metro/native release includes their copyright/license notices.
Compile and distribute the notices for the code/fonts/native libraries actually
shipped; preserve any applicable NOTICE text, source-offer/source-availability
requirements and modification notices. Verify their inclusion in the final AAB.
Do not delete copyright notices to make the project appear “copyright-free.”

## External references and placeholders

- No remote artwork or audio URL was identified in the live game source.
- Google's privacy-policy URL is intentional; it is not an unlicensed media asset.
- The Expo native-preview landing template links to Expo Go and loads
  `qr-code-styling` from unpkg. It is a development/native-update landing resource,
  not the gameplay route served by `--web`. Review its dependency/notice and
  external-script policy separately if using that landing page publicly.
- APP_NAME/EXPS placeholders in that template are substituted by the server.
  They are not unfinished game branding and were not deleted in a way that would
  break preview/update links.
- A legacy source comment refers to placeholder theme values; no corresponding
  placeholder artwork, key or sample contact was found in the playable UI.

No third-party copyright notices or licensed fonts/icons were removed.

## Additional code/security scan findings

Workspace dependency scan: **1 critical, 6 high, 3 moderate** advisory findings.
These are scanner severities, not proof that every issue is exploitable from
the Android game. The scanner covered the workspace, unlike the app-filtered
license inventory.

- Critical: `proxy-addr@2.0.7` (GHSA-jqcg-44mw-7w3h); scanner reports a fix at
  2.0.8. It is not present in the app-filtered license inventory; assess the
  separate backend's proxy configuration and dependency chain.
- High: `brace-expansion@5.0.9` (two advisories), `braces@3.0.3`,
  `node-forge@1.4.0`, `source-map-js@1.2.1`, and `uuid@7.0.3`.
- Moderate: `brace-expansion@5.0.9`, `decode-uri-component@0.2.2`,
  and `fast-uri@3.1.7`.

Static scan: **3 high automated file-path flags** in `server/serve.js` (manifest
and static reads) and `server/web-files.cjs`. Manual inspection found an explicit
ios/android manifest allowlist and web path validation/root-containment guards.
All five existing web-hosting tests, including unsafe-path rejection, passed.
These are triage findings, not three confirmed arbitrary-file-read exploits.
Native manifest/static mode deserves additional targeted tests before dismissal.

Privacy/dataflow scanner: **0 findings**. This is not a determination that no
personal data is processed; the ad SDK handles device/ad-related information.

No dependency upgrades were performed as part of this copyright audit. Resolve
applicable advisories through compatible parent-package updates and regression
checks rather than blindly forcing transitive major versions.

## Google Play release checks that remain

1. Retain verifiable creation/license records for all art, including the legacy
   icon, and obtain trademark/legal review where necessary. Asset hashes and
   AI-generation history are not a certificate of non-infringement.
2. Bundle the required open-source/font/native SDK notices and resolve the
   development launcher's undocumented licensing terms.
3. Publish and verify an active HTTPS privacy-policy URL, include it in Play
   Console, and confirm the in-app policy accurately covers final SDK behavior.
4. Complete accurate Data safety, Contains ads, Advertising ID, target-audience
   and content-rating declarations for the final build. Non-personalized ads
   still involve data processing.
5. Validate regional consent/privacy-options requirements. A separate Settings
   privacy-options control is not established by the policy-page link.
6. Review rewarded random rewards and virtual wagering against the final target
   age group, local rules, Google Play and AdMob policies. The Hub discloses odds
   and says virtual-only/no purchases/no cash-out, but that is not blanket
   policy approval or a Families-policy certification.
7. Inspect and test the actual signed AAB: merged permissions, SDK/target API,
   native dependency notices, ad/consent behavior, store art and ad placements.
   The source configuration alone is not the final Play submission.

## Reproduce this evidence

From the workspace root:

    node artifacts/cloud-garden/scripts/export-licensing-inventory.cjs
    python3 artifacts/cloud-garden/scripts/generate-hardcore-audio.py --check
    node --test artifacts/cloud-garden/tests/web-hosting.test.cjs

The inventory export does not install/update dependencies. Re-run the audit and
review any newly introduced assets/dependencies before future releases.

## Official references consulted

- Google Play Intellectual Property:
  https://support.google.com/googleplay/android-developer/answer/9888072?hl=en
- Google Play app review declarations:
  https://support.google.com/googleplay/android-developer/answer/9859455?hl=en
- Google Play Advertising ID:
  https://support.google.com/googleplay/android-developer/answer/6048248?hl=en
- Google Play Ads:
  https://support.google.com/googleplay/android-developer/answer/9857753?hl=en-GB

Installed package LICENSE / LICENSE_FONT files were the primary dependency-license
evidence; public package descriptions alone are not sufficient permission.
