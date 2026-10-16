# Headless physics regression checks

From the workspace root:

```sh
pnpm --filter @workspace/cloud-garden test
pnpm --filter @workspace/cloud-garden run validate
```

`test` (also available as `test:physics`) compiles only `lib/engine.ts`,
`lib/objects.ts`, and `lib/levels.ts` with the existing TypeScript compiler,
then runs Node's built-in test runner against the real Matter.js engine.
`validate` runs the app's typecheck followed by the tests. No Expo server,
browser, device, network access, or additional dependencies are needed.
Compilation goes into the ignored `.physics-test-build/` directory.

The suite discovers every entry in `LEVELS`, plays its hint in order using
`addStroke` and `slice`, and requires an actual collision between Cloud and
that engine's plant sensor, plus a three-star win. Slice hints get 120 fixed
physics steps (two simulated seconds) to let timber settle before release.
The running simulation is bounded by the game's 40-second limit. Tests never
teleport Cloud or enlarge the sensor to force a win.

Focused checks also cover finite released mass/inertia/position/velocity,
rope intersection and misses, constraints on split timber, one-step blade
lifetime in both ready and running states, directional timber impulses and
per-swipe deduplication, static timber, and repeatable disposal.

Tests use simulation ticks rather than wall-clock waits. Particle randomness
is cosmetic and is not used in assertions. Each engine is disposed after its
test, including when an assertion fails.
