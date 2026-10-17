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
