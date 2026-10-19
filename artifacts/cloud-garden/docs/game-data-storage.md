# On-device saves

Progress and reward inventory use `@react-native-async-storage/async-storage`
2.2.0, declared as a production dependency. Expo/React Native autolinks its native
Android module; no manual linking command or extra storage permission is needed.
The current workspace's Android dependency resolver and the existing native
build's generated registry both include `AsyncStoragePackage` / `rnasyncstorage`.
This is not a new native dependency.

## Save format and compatibility

Existing keys remain unchanged: `cloud-garden:v1`, plus the `hardcore`, `genesis`,
`void` and `singularity` `cloud-garden:<mode>:v1` keys. Reward currency, inventory,
receipts and daily streaks remain at `cloud-garden:app-rewards:v1`.

`saveGameData` and `loadGameData` in `lib/gameData.ts` accept the AsyncStorage
adapter, key and typed profile. The existing profile readers sanitize loaded
scores, stars, unlocks, completion times and reward counts.

- Load successfully before enabling profile changes.
- Save immediately after each transition, in per-key order.
- Serialize snapshots outside React state updater functions.
- Preserve malformed or temporarily unreadable saves; never overwrite them with
  defaults. Missing keys, unlike read failures, represent first-time players.
- Keep failed writes in memory and show a Retry action. A forced process kill
  during an unfinished or failed write cannot be guaranteed to retain that change.
- Backgrounding requests a flush/retry; queued writes continue through unmounts.
- The browser uses AsyncStorage's browser adapter; native uses Android storage,
  not `window.localStorage`.

AsyncStorage is not encrypted storage or cloud backup. Do not store credentials
or sensitive personal information here. Changing package identifiers creates a
different Android storage sandbox. A normal same-package, same-signature update
preserves saves; uninstalling or clearing app data removes local progress.
Web saves and the `.preview` APK do not automatically transfer to the store app.

## Verification

Run `pnpm --filter @workspace/cloud-garden run validate` for type checking and
regression tests. Persistence tests exercise ordered writes, remounts, all five
mode keys, reward balances, old save records, malformed saves, and read/write
failure recovery.

The completed source validation passed 963 tests. A focused browser integration
pass confirmed Campaign/Genesis records and reward inventory load correctly,
real settings/level-selection changes survive reloads, write-failure Retry
persists the latest in-memory changes, and malformed-data recovery preserves
other profiles. Fixtures were seeded only once, never on each reload. These
checks exercise the browser adapter, not Android device storage.

After rebuilding the testing APK, complete levels, spend an inventory item,
force-close and reopen. Confirm scores/stars/unlocks and balances remain.
Repeat with a same-package signed update, and check storage-failure Retry where
device tooling permits. Already-downloaded APKs/ZIPs predate this source fix.
