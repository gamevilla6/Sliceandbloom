# App Reward Hub

The hub is optional. Ads never replace normal retry or block gameplay.
`lib/rewardHub.ts` contains pure reward transitions; `useAppRewards` owns the
single versioned AsyncStorage profile (localStorage on web). Old inventories
migrate without losing brushes or fast-passes.

## Reward flow

1. The player sees the exact reward or random prize pool/odds, then chooses
   **Load video**. Once ready, **Watch video** explicitly starts the ad.
2. The existing native SDK adapter records `EARNED_REWARD`. Only a subsequent
   `CLOSED` invokes the reward callback. Early dismissal/error grants nothing.
3. One receipt ID commits the reward, cooldown/streak and recent ledger together.
   Duplicate callbacks cannot grant the same receipt twice. Full-profile writes
   are ordered; storage failures are visible and have a retry action.
4. Development native builds use Google's test unit. Android release IDs are
   unchanged. Expo Go and web cannot serve the native SDK; no fake ads grant
   rewards. Test real ad completion, early close, no-fill and SDK errors in an
   Android development build before publishing.

## Rules

- One daily rewarded claim per local calendar day. Consecutive claims advance
  days 1–7; missing a day restarts at day 1, without removing owned items.
  Completing day 7 starts a fresh cycle the following day.
- One mystery vault total per hour, shared across Bronze/Silver/Gold. The hour
  starts when a successful reward is committed, not when loading an ad.
- Vault odds are displayed before opt-in. Skin selection is uniform within the
  three-skin pool; an owned skin gives 100 free ink credits instead.
- Infinite ink adds five wall-clock minutes, including time outside the app.
  It removes the line-length budget only; stroke/time rules and physics safety
  limits remain. Expiry restores the normal budget without resetting the world.
- Refill starts a fresh attempt with full base ink. A Golden Brush starts a
  fresh attempt with 50% more ink. Both are consumed only when usable.
- A skip opens the next stage without stars, scores or a fabricated clear.
  The exclusive Genesis pass works only in Genesis. A durable entitlement in
  the same transaction as consumption recovers a failed separate progress write.
  The older Fast-Pass is a one-challenge trial, not a permanent skip.
- Ink Rush costs 20 **free, virtual-only** ink credits after confirmation:
  40% pays 0, 40% pays 40 (2×), 18% pays 100 (5×), 2% pays 500.
  Optional ad spins cost no ink and pay at least 10 on a no-multiplier outcome.
  Prizes are non-transferable, with no purchases or cash-out.
  The result is committed once before the cosmetic animation starts. Reloading
  or dismissing the hub cannot reroll it.

## Limits

Reward inventory and receipt history are device-local, not a cloud backup or
fraud-proof account ledger. If the optional per-installation sync is available,
only level unlocks, stars, scores and best times are included.
Clearing app/browser data removes progress and rewards. Client clocks can be
changed: backward daily claims are blocked, but trusted-time enforcement and
cross-device recovery would require a server. Receipt history is bounded to
128 and the visible ledger to 20. Virtual randomness is not cryptographic.

The random reward disclosures follow Google's
[rewarded ad policy](https://support.google.com/admob/answer/7313578).
The hub uses bounded SVG/Reanimated effects and respects reduced motion.
