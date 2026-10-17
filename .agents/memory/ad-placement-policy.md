---
name: Retention-safe ad placement
description: Product rules for milestone interstitials and keeping ads out of interactive puzzles.
---

Forced interstitials belong only at post-victory breaks after every third
successful completion across modes. Deaths, retries, skips, menu visits, launch
and foreground return are not opportunities for a forced ad. If an eligible
ad is unavailable, skip that opportunity rather than deferring a surprise ad.

**Why:** The user explicitly requested milestone revenue without hurting player
retention. The fast retry loop is part of this game's appeal; monetizing failures
with forced ads would undermine it.

**How to apply:** Preserve this rule when adding modes or changing navigation.
The held-droplet/pre-release board is still interactive gameplay, not a menu:
keep its drawing space and controls free of banners. Optional rewarded offers
must never remove the normal free retry path.
