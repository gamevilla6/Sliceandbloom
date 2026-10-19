---
name: Git inspection guard
description: Handling unexpected index.lock safety errors during read-only inspection
---

Do not request dangerous Git permissions merely to complete a read-only final
inspection. Use file-based checks and any already-returned diff output instead.

**Why:** Read-only inspection batches in this workspace have returned the
`index.lock` safety guard after printing a diff summary. Setting
`GIT_OPTIONAL_LOCKS=0` did not prevent that failure. Retrying the same inspection
does not justify permission to modify Git internals.

**How to apply:** If this guard appears during inspection rather than a requested
Git mutation, stop repeating it. Type checks, regression tests, direct file
inspection and package-manager frozen-lockfile checks remain independent.
