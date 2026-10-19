---
name: Expo APK builds without GitHub
description: An approved temporary Expo Linux sandbox is an alternative to repository-triggered builds.
---

Do not treat GitHub linking as a prerequisite for every Expo-hosted native APK
build. With a real, accessible Expo project, an EAS Linux sandbox can start
without a checkout and receive an allowlisted source archive directly.

**Why:** Repository-triggered builds require GitHub, but sandboxes do not.
The sandbox route produced a real native APK despite unavailable workspace
GitHub CLI authorization. It also avoids creating a new empty app in place
of the existing game or using EAS CLI.

**How to apply:** Get explicit approval for billable compute per attempt,
bound the build command's duration, upload no secrets or unrelated project
files, and distinguish a sandbox build from an EAS Build dashboard record.
Verify the actual APK and finish exporting its artifact before stopping
the sandbox. Confirm the sandbox is stopped; an initial stop response can
still say RUNNING. Stored artifacts remain downloadable after shutdown.

Local Gradle is a viable alternative for a QA APK when EAS cannot find its
GitHub repository; the repository-link requirement belongs to the connected
cloud-build API, not Android compilation itself.

**Why:** A verified, debug-signed QA APK was built locally despite the unresolved
Expo repository association. Do not make new billable sandbox sessions the only
offered route when a local Android toolchain can run.

**How to apply:** Check available local toolchains and resources first. Production
signing remains a separate requirement; never relabel a debug-signed build as a
store release.

For a local Gradle attempt, explicitly select the JDK version rather than
assuming the available generic Java module provides Java 17.

**Why:** The available GraalVM 22.3 module supplied Java 19. The JDK 17 system
dependency supplies the expected toolchain without changing Expo or React Native.

**How to apply:** Verify `java -version` first. Keep downloaded Android SDKs,
Gradle caches and disposable preview checkouts in ignored build-output storage.
Local compilation does not provide access to Expo-managed production signing keys.

After a workspace restart, inspect existing SDK and Gradle build caches before
starting over. A lost background task is not evidence that a binary was built.

**Why:** A restart interrupted native compilation and its packaging watcher,
while downloaded toolchains and incremental native outputs survived on disk.

**How to apply:** Resume from the preserved native checkout when its source
identity is still current. Verify the actual newly built binary before archiving;
do not deliver an older APK merely because its filename matches.

For build/source comparisons, compare effective dependency names and versions,
not only the raw package manifest.

**Why:** Expo prebuild can add Expo, React and React Native to `dependencies`
while identical declarations remain in `devDependencies`. That changes the
manifest bytes without changing the requested runtime versions.

**How to apply:** Normalize both sections before deciding a build is stale;
still treat any actual version or runtime-source mismatch as significant.
