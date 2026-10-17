---
name: Cinematic camera and puzzle access
description: Keep a full-level view available when adding camera focus effects.
---

Cinematic focus must retain an accessible full-level overview, and must remain
a rendering effect rather than a change to puzzle geometry or physics.

**Why:** A 1.5× phone viewport cannot always contain both the water and distant
mechanisms or targets. Mandatory zoom without an overview could make existing
routes impossible to draw, even when their physics solutions remain valid.

**How to apply:** Preserve the overview option in future camera changes. Keep
controls and ads outside camera transforms, and use the same transform for
rendering and inverse draw/slice input. Hold the camera steady during strokes so
camera movement alone cannot consume ink under a stationary finger.
