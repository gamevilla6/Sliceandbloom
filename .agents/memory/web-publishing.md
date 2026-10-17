---
name: Browser publishing verification
description: Distinguish a playable browser export from a healthy Expo mobile landing page.
---

A healthy published Expo domain is not proof that the browser game is live.
Verify that the deployed root serves the playable web entry, not just the
native app's landing page or QR instructions.

**Why:** This project had a successful public autoscale deployment whose root
only served an Expo landing page, while the complete browser game already
worked in Metro previews. A separate browser export and hosting mode were
needed; duplicating the game implementation was not.

**How to apply:** Keep one shared game implementation and preserve Android
identity/signing when changing browser hosting. Verify the exported browser
entry and its assets with the production server. Updates require the user's
publishing action before the existing public URL changes. Never call a
development preview the permanent public URL or claim the new game is live
because a previous deployment is healthy. Native AdMob is unavailable on web;
do not simulate ads or grant ad-earned rewards as a browser fallback.

Keep generated browser runtime assets out of Git, but not out of the
deployment image via `.replitignore`.

**Why:** Publishing applies these exclusions to the built image too. The Expo
export can succeed yet the production server crash because its generated
entry page was excluded during image packaging.

**How to apply:** Use `.gitignore` for generated browser assets and retain them
in the published image. Check both build logs and runtime startup logs; a
successful local export alone does not verify deployment packaging.
