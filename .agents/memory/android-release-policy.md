---
name: Android release policy
description: First-upload versioning, safe preview ads and GitHub build authorization.
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

Treat GitHub connection health and build-tool authentication as separate checks.

**Why:** A healthy OAuth connection with repository/workflow scopes has been
observed while the workspace CLI remained logged out and the integration SDK
provided no API client. Reconnecting healthy OAuth is not a demonstrated fix
for credential-delivery failures.

**How to apply:** Verify the actual execution path before promising repository
creation or a remote build. Use an available provider API or the Git pane/manual
Actions flow when CLI authentication is unavailable. Do not loop on OAuth or
request raw tokens to work around an unexplained healthy-connection mismatch.

Repository-triggered EAS builds also need a repository explicitly linked in the
Expo project's GitHub settings. A Replit GitHub connection and a successful
GitHub push do not establish that Expo project association.

**Why:** Workspace authorization, Git transport authentication, and Expo's source
repository association are separate requirements.

**How to apply:** When Expo reports no repository for an app ID, direct the user
to that Expo project's GitHub settings rather than repeating Replit OAuth or
asking for another push. Verify remaining build budget before retrying.
