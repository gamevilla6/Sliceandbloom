---
name: Native AdMob build configuration
description: An SDK Gradle configuration gap that Expo manifest checks and JS exports do not catch.
---

The installed AdMob SDK 17.2 needs its top-level native JSON configuration
alongside the Expo plugin configuration; keep their Android App IDs aligned.

**Why:** Its Gradle JSON loader uses inconsistent property names in the branch
for missing native settings. The native build then fails looking up
`googleMobileAdsJson`, even though the Expo plugin generated correct manifest
metadata and Android JavaScript bundling succeeded.

**How to apply:** Keep the native JSON contract covered by configuration
regressions; audit it when upgrading the SDK rather than assuming this
version-specific constraint lasts forever. Require an actual native Gradle
build before claiming an APK exists. Manifest inspection and bundle export
are not substitutes for native compilation.
