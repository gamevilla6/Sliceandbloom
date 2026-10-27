---
name: Online-only play with local-first saves
description: User-selected internet and progress-sync scope for the game
---

Require a verified internet connection to play. AsyncStorage is the authoritative save for progress and rewards. Private cloud sync is optional and best-effort; a missing endpoint, 404, or timeout must never block gameplay or replace local data. Do not add accounts, public leaderboards, or promise cross-device recovery.

**Why:** The user asked to make cloud saving optional after the save endpoint returned 404; local AsyncStorage must remain usable without a cloud service.

**How to apply:** Keep gameplay blocked when verified internet is unavailable, but never block it for cloud-save status. Describe any per-install cloud sync as optional; do not imply a public leaderboard, player account, or cross-device restore.
