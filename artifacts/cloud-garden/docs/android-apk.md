# Installable Android test APK — GitHub Actions

This workflow builds an APK, not an AAB, and does not publish to any store.
It does not need an Expo account, an Expo token, or a production signing key.

## What the preview contains

- The real game and native Google Mobile Ads SDK, with official **test ad units**.
- Release-mode bundled JavaScript: no Metro server or Expo Go is needed.
- A separate name, **Slice & Bloom Preview**, and package,
  `com.gogoldatta.sliceandbloom.preview`, so it can coexist with the store app.
- The Expo template's **public debug certificate**. This is for testing only.
- ARM64 and ARMv7 native libraries for physical Android devices.

The repository's production identity, version code and live ad configuration
are not changed. Only a disposable CI checkout gets the preview identity.
Preview progress is stored separately from the production app.

## Run the build

1. Put the current project code in a **private GitHub repository**. Include the
   root workspace manifests, lockfile, shared libraries and mobile app source.
   Never commit `.env`, tokens, signing keys, credentials, or generated APKs.
   In Replit, the **Git pane** can create/connect a repository and push commits.
2. Ensure the default branch contains `.github/workflows/android-apk.yml` and
   `artifacts/cloud-garden/scripts/prepare-preview-apk.cjs`.
3. In GitHub, open **Actions → Build Android test APK → Run workflow**.
   Select the branch containing the latest game code and start one run.
4. After a **successful** run, open its **Artifacts** section and download
   **slice-and-bloom-preview**. Extract the archive. The APK is
   `slice-and-bloom-preview.apk`; a SHA-256 checksum and signature/package
   inspection reports are included.

The workflow runs manually only, has a 60-minute timeout and retains artifacts
for 14 days. GitHub Actions availability, quotas and billing belong to your
GitHub account. An unsuccessful build has no downloadable APK; inspect its
failed step rather than treating configuration checks as a completed build.

## Install on an Android phone

Transfer the extracted APK to the phone, open it and allow **Install unknown
apps** for the browser or file manager you used. Disable that permission
after installation if desired. Install only the artifact from your own
successful private build; verify `SHA256SUMS.txt` when transferring it.

Native rewarded/banner/interstitial testing still depends on network
availability and Google SDK/consent behavior. Test a successful rewarded ad,
early close, unavailable-ad state, quick retry and progress persistence.
There is no simulated reward fallback when a native ad cannot be shown.

This APK is not a production security/signing deliverable. Do not upload it
to Google Play or use its public debug key for production. Keep the separate
store release process and a privately managed upload key for the AAB.

## If Agent cannot start the build

An integration marked connected/healthy does not guarantee that the current
workspace's GitHub CLI has received authorization. If the CLI says it is not
logged in and the provider API client is unavailable, no remote repository,
push, workflow run or APK should be claimed. Use the Git pane and GitHub's
manual Actions controls above. Do not paste passwords or tokens into chat.
