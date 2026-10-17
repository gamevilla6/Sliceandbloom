---
name: Physics release safety
description: Matter.js held-body lifecycle and verification of physical puzzle solutions
---

Create a movable droplet as a dynamic body and only then freeze it with `Body.setStatic`. Do not initialize a releasable droplet with `isStatic: true`.

**Why:** In this project's Matter.js version, a body created static had infinite mass/inertia and no saved dynamic properties. Releasing it produced NaN positions despite passing TypeScript and rendering correctly before release.

**How to apply:** Verify release yields finite position, velocity and mass. For changes to friction, colliders, targets or levels, simulate each supplied hint to an actual sensor collision; a visual preview alone cannot verify puzzle solvability.

Validate hints with player-paced delays, not only actions submitted in one physics frame.

**Why:** A boulder puzzle passed when both swipes happened instantly but failed after the stone settled or time elapsed between swipes. The hint was technically solvable yet unreliable for a person.

**How to apply:** Simulate waiting before the first action and pauses between successive actions, including moving targets and falling timber. Prefer a more reliable layout over requiring frame-perfect input.

Keep a running physics world independent of responsive presentation mounts.

**Why:** Switching between portrait and landscape changes the board's position in the React tree and can remount it even when the level has not changed. A board-owned world silently resets an in-progress puzzle on rotation.

**How to apply:** Dispose the world for a new level, retry, or leaving the game—not for a layout change. Keep inverse touch coordinates aligned with the newly measured board.

Do not automatically memoize renderers that read the mutable Matter world.

**Why:** Expo's React Compiler cached SVG output from stable body arrays even as their contents changed. The simulation won correctly while a heavy block remained drawn at its starting position; Replay also displayed the previous attempt's open gate and bloomed flower.

**How to apply:** Keep imperative physics views out of automatic memoization, refresh them on simulation frames, and recreate attempt-specific presentation on retry. A passing headless physics test does not verify that the rendered body positions or replay state update.

Thermal level design must account for every dynamic block, not only the droplet's intended route.

**Why:** Mandatory cut timber could settle on a rotating arm inside a furnace and reset an otherwise solved route after two seconds. Different preparation delays exposed failures that a direct droplet-path check missed.

**How to apply:** Keep unavoidable resting positions out of hot zones. Validate the whole scene with different waits before release and between actions; do not suppress block heating to make a level pass.

Validate required mechanisms as well as a genuine flower collision.

**Why:** A bidirectional portal exit near the launch column let Cloud bypass an unopened counterweight gate. Separately, a flower pedestal intercepted the key before it reached its switch.

**How to apply:** Keep both portal ends clear of pre-unlock routes and target furniture out of falling-key columns. Assert that every required switch activates and each required portal is used before accepting a solution.

When deriving or mirroring challenge layouts, transform complete collider bounds and replay the supplied route in Matter.js.

**Why:** Transforming only an extended hazard's anchor can shift its collision shape enough to make an otherwise valid hint lethal.

**How to apply:** Keep solver-based regression coverage for each generated variant, including hazards, and do not rely on visual inspection of transformed coordinates.

Preserve collision-event victory for existing single-droplet routes; a post-step overlap is not interchangeable with a target collision callback.

**Why:** An added overlap shortcut froze droplets before the real target event and invalidated previously verified solutions across several modes, even though the UI reported a win.

**How to apply:** Assert genuine sensor events in solver regressions. When adding paired targets, require separate child-to-bud contacts and all mechanism objectives, rather than treating a generic overlap or win status as proof.
