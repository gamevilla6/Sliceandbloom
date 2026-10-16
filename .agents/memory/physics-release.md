---
name: Physics release safety
description: Matter.js held-body lifecycle and verification of physical puzzle solutions
---

Create a movable droplet as a dynamic body and only then freeze it with `Body.setStatic`. Do not initialize a releasable droplet with `isStatic: true`.

**Why:** In this project's Matter.js version, a body created static had infinite mass/inertia and no saved dynamic properties. Releasing it produced NaN positions despite passing TypeScript and rendering correctly before release.

**How to apply:** Verify release yields finite position, velocity and mass. For changes to friction, colliders, targets or levels, simulate each supplied hint to an actual sensor collision; a visual preview alone cannot verify puzzle solvability.

Keep a running physics world independent of responsive presentation mounts.

**Why:** Switching between portrait and landscape changes the board's position in the React tree and can remount it even when the level has not changed. A board-owned world silently resets an in-progress puzzle on rotation.

**How to apply:** Dispose the world for a new level, retry, or leaving the game—not for a layout change. Keep inverse touch coordinates aligned with the newly measured board.
