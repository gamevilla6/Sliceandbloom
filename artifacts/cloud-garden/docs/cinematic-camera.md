# Cinematic gameplay camera

`useCinematicCamera` uses Reanimated shared values and `withTiming` to move from
1× overview to 1.5× gameplay focus in 380 ms. Menus, level grids, reward/ad pauses,
wins and failures return to 1× in 260 ms. Retry/new levels reset the camera without
recreating or scaling the Matter world. Reduced Motion keeps the overview.

Only the SVG canvas is inside the animated container. Its origin is the top-left;
HUD, modal buttons, banners and the Overview/Focus control remain unscaled.
Focus tracks active water toward the plant (or unfinished Genesis buds).
The Overview control makes offscreen puzzle mechanisms accessible.

## Input transform

The touch responder is a stationary sibling of the overview control, outside the
animated canvas. With base viewport `B`, shake `S` and camera `C`:

```
worldScale = C.scale * B.scale
screenOffset = C.offset + C.scale * (B.offset + S)
worldPoint = (localTouchPoint - screenOffset) / worldScale
```

The same camera math drives the rendered transform and the inverse input
transform. At gesture start, cancel in-flight zoom/focus animations and read the
actual shared values, not their destinations. Keep that matrix steady during the
stroke, including a mid-transition stroke; resume zoom on release/termination.
Rotation refreshes the inverse matrix without moving Matter bodies.

Pure viewport tests cover intermediate scales, screen shake, phone/tablet
letterboxing, camera bounds and coordinate round trips.
