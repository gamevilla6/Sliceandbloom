---
name: Browser verification for fast game loops
description: Avoid false retry and persistence failures caused by browser test setup
---

Seed local progress once, not through an unconditional initialization script that runs on every navigation.

**Why:** A test setup removed the Void save on every reload and falsely reported lost progress. The application never deleted that key.

**How to apply:** In an isolated browser context, write fixtures once after loading the origin. Subsequent reloads must not reseed or clear storage. Verify the setup before changing application persistence code.

Batch timed input and its immediate assertion into one browser execution for short countdown levels.

**Why:** Time spent between separate browser-tool calls let a real timeout occur before the requested manual retry, falsely appearing to count manual retries as deaths.

**How to apply:** Measure elapsed wall time and the remaining timer immediately before pressing R. Keep tap-to-retry under the intended reaction window; do not attribute a prior legitimate timeout to the retry itself.

A working Expo screenshot does not by itself prove the managed workflow restarted successfully.

**Why:** An older Expo process continued serving the preview while the new workflow waited for an alternate-port prompt.

**How to apply:** Confirm the new workflow logs reach Metro readiness on the artifact's assigned port. Resolve confirmed stale process ownership rather than accepting a different port or changing routing to hide the conflict.

Finish browser navigation checks and their small UI corrections before compiling the native QA APK.

**Why:** Building in parallel with browser verification required repeated native rebundles when the browser exposed additional spacing and contrast issues. Cached native libraries do not make an older bundled JavaScript UI current.

**How to apply:** Complete the single focused browser pass, resolve its findings with cheap checks, then freeze and fingerprint the source staged for the APK build. Do not treat browser success as proof of native screen layout or physical-device behavior.
