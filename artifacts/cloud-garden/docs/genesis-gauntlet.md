# Genesis Gauntlet: 100 challenges

Genesis retains its original 45 challenges and independent device records.
The expansion adds five 11-stage chapters: Refraction (46–56), Counterweight
(57–67), Twin Bloom (68–78), Resonance (79–89), and Master Circuit (90–100).

## Playing the new mechanisms

- **Glass locks:** use Slice and swipe diagonally through a mirror's center.
  Its physical angle follows the swipe. Reflect the red beam into the numbered
  gold receiver; a green receiver opens its matching gate. Red beam segments
  are lethal. After all receivers latch, their beams become harmless gold traces.
- **Counterweight chains:** cut the red upper-left starter latch. Watch each
  falling weight take up the gate rope and strike its numbered switch. A switch
  releases the next weight; wait for the entire chain before pressing Drop.
- **Twin buds:** the triangular wedge divides Cloud once. The two numbered
  droplets must reach their respective numbered buds. One collected droplet
  cannot water the other bud. A lost child fails the whole attempt.
- **Ink Wings:** draw both outward ramps before release. These stages need
  substantially more ink than the slice-only stages, but have a two-stroke cap.

The clock starts on first input or Drop, not while reading a fresh stage.
Hints show the required gestures and explain the preparation/waiting sequence.
Retry or **R** recreates the complete world without changing earned records.

## Implementation

- `lib/genesisExpansion.ts`: eleven new puzzle arrangements with five spatial
  and budget variations; bounded exponential preparation/ink budgets.
- `lib/genesis.ts`: typed mechanism geometry, ray/edge intersection, angle-based
  reflection, physical rope take-up, contact-triggered stage latches, splitting
  with finite conserved mass, and paired collection.
- `lib/engine.ts`: integrates everything into the existing fixed Matter loop.
  Forces, portal cooldowns, hazards and stuck checks handle each active child.
- `components/GenesisLayer.tsx`: reads live Matter state, rendering the exact
  traced beams and current mechanism positions in the existing logical viewport.

No new intervals, physics worlds per child, dependencies, ad changes, or save
namespaces are introduced. The existing Genesis AsyncStorage key is retained,
including its web implementation. A completed former final stage unlocks 46
when loaded with the expanded count. Stars, scores and best times remain personal
device records; this is not an online leaderboard.

## Verification and performance limits

Run `pnpm --filter @workspace/cloud-garden run validate`.
The suite preserves the original 45 definitions with an integrity hash,
solves every new stage through Matter sensor contacts at two input timings,
and checks reflection, stage order, paired victory/failure, save expansion and
repeated disposal. Heavy-stage profiling measures live physics ticks, not
finished/no-op frames.

Beam traces are capped at six reflections, each split creates exactly two
children, particles remain globally capped, and only the current stage runs.
Container physics timing and responsive web checks do **not** establish native
60 FPS on older Android phones; that still needs physical-device profiling.
