---
name: Android release policy
description: First-upload versioning and safe ad behavior in EAS preview versus production.
---

Keep preview APKs on official Google test ad units even though their JavaScript
runs in release mode. Production AABs use the supplied live Android units.

**Why:** `__DEV__` is false in release-mode QA APKs too, so relying on that flag
alone would expose testers to live ads and risk invalid ad traffic.

**How to apply:** Preserve the explicit preview/production ad-mode separation
when modifying build profiles; verify both modes instead of disabling all test
protection globally.

The requested first Android upload is version name 1.0.0, version code 1.
Local/manual versioning was chosen to preserve that initial code.

**Why:** Remote EAS auto-increment seeded from local code 1 can make the first
build code 2, contrary to the requested starting value.

**How to apply:** Increase the code for subsequent Play uploads. If switching to
remote versioning later, initialize it from the actual latest Play version;
never reset it to 1 after a release.
