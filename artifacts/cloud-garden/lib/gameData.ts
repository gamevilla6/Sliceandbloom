/** AsyncStorage-compatible interface; injectable for deterministic failure/race tests. */
export interface GameStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
}

const queues = new WeakMap<GameStorage, Map<string, Promise<void>>>();
function queueFor(storage: GameStorage) {
  let queue = queues.get(storage);
  if (!queue) { queue = new Map(); queues.set(storage, queue); }
  return queue;
}

/** Save a snapshot now, then serialize writes per key, including across remounts.
 * AsyncStorage is app-private persistence, NOT encrypted credential storage.
 * Errors are deliberately propagated so callers can retain data and offer retry.
 */
export async function saveGameData<T>(storage: GameStorage, key: string, data: T): Promise<void> {
  const json = JSON.stringify(data);
  if (json === undefined) throw new Error('Game data is not serializable.');
  const queue = queueFor(storage);
  const write = (queue.get(key) ?? Promise.resolve())
    .then(() => storage.setItem(key, json)).then(() => {});
  // A rejected write must not poison subsequent retries.
  queue.set(key, write.catch(() => {}));
  await write;
}

/** Preserve existing keys and schemas. Only a genuinely absent save uses defaults;
 * a failed read or malformed save must never be replaced by an empty profile.
 */
export async function loadGameData<T>(
  storage: GameStorage, key: string, defaults: T, read: (raw: unknown) => T,
): Promise<T> {
  await queueFor(storage).get(key);
  const raw = await storage.getItem(key);
  if (raw === null) return defaults;
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('Saved game data is malformed.');
  return read(parsed);
}

export interface SavedGameSnapshot<T> {
  data: T;
  ready: boolean;
  saving: boolean;
  storageError?: string;
}

/** Synchronous transitions outside React state updaters prevent duplicate writes
 * in Strict Mode, and prevent rapid completions/spends using stale snapshots.
 */
export function createGameDataStore<T>(
  storage: GameStorage, key: string, defaults: T, read: (raw: unknown) => T,
) {
  let snapshot: SavedGameSnapshot<T> = { data: defaults, ready: false, saving: false };
  const listeners = new Set<() => void>();
  let loading: Promise<void> | undefined;
  let latestWrite: Promise<void> = Promise.resolve();
  let revision = 0;
  let dirty = false;
  const publish = (patch: Partial<SavedGameSnapshot<T>>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach(listener => listener());
  };
  const load = (): Promise<void> => {
    if (snapshot.ready) return Promise.resolve();
    if (loading) return loading;
    loading = loadGameData(storage, key, defaults, read)
      .then(data => publish({ data, ready: true, storageError: undefined }))
      .catch(() => publish({
        storageError: 'Saved game data could not be loaded. Retry loading; your existing save has not been replaced.',
      }))
      .finally(() => { loading = undefined; });
    return loading;
  };
  const persist = () => {
    const version = revision;
    publish({ saving: true });
    latestWrite = saveGameData(storage, key, snapshot.data)
      .then(() => {
        if (version !== revision) return;
        dirty = false;
        publish({ saving: false, storageError: undefined });
      })
      .catch(() => {
        if (version !== revision) return;
        publish({
          saving: false,
          storageError: 'Progress is in memory but could not be saved. Retry saving before closing the app.',
        });
      });
    return latestWrite;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    load,
    update: (transition: (current: T) => T): boolean => {
      if (!snapshot.ready || snapshot.storageError) return false;
      const next = transition(snapshot.data);
      if (next === snapshot.data) return false;
      revision++;
      dirty = true;
      publish({ data: next });
      void persist();
      return true;
    },
    // Saves start immediately after each mutation. Backgrounding/remounting never
    // waits for a debounce timer; a failed last write can be retried explicitly.
    flush: () => {
      if (!snapshot.ready) return load();
      if (dirty && !snapshot.saving) return persist();
      return latestWrite;
    },
  };
}
