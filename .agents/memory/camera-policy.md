---
name: Normal gameplay view
description: The user removed the cinematic Overview/Focus camera modes.
---

Use the normal, unzoomed full-level gameplay view without Overview/Focus modes.

**Why:** The user asked to remove Overview and Focus after the cinematic camera
was added.

**How to apply:** Preserve the normal viewport in subsequent visual changes
unless the user requests a different camera behavior.

For requests to enlarge the mobile play area, reclaim space from surrounding
menus and redundant padding rather than applying a crop-to-fill camera.

**Why:** The user wants larger gameplay without reintroducing the removed
cinematic zoom. Cropping can hide the droplet, plant, or solution geometry;
stretching the world changes the validated physics.

**How to apply:** Keep uniform full-level fitting and its inverse touch mapping.
Use real safe-area insets and a compact HUD, with secondary information in a
paused details view.
