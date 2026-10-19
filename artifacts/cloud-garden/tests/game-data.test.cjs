const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createGameDataStore, saveGameData, loadGameData } = require('../.physics-test-build/gameData.js');
const { DEFAULT_PROGRESS, completeProgress, readProgress } = require('../.physics-test-build/progress.js');
const { DEFAULT_APP_REWARDS, readAppRewardProfile, recordRewardedHint } = require('../.physics-test-build/appRewards.js');

function memoryStorage() {
  const values = new Map();
  return {
    values, writes: [], failRead: false, failWrite: false,
    async getItem(key) {
      if (this.failRead) throw Error('device read unavailable');
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      if (this.failWrite) throw Error('disk full');
      this.writes.push([key, value]);
      values.set(key, value);
    },
  };
}
const progressStore = (storage, key = 'cloud-garden:v1') =>
  createGameDataStore(storage, key, DEFAULT_PROGRESS, raw => readProgress(raw, 100));
const win = (p, level = 0, score = 1500, time = 3.5) =>
  completeProgress(p, 100, level, 3, { score, time });

test('no progress write is permitted before the existing save finishes loading', async () => {
  const storage = memoryStorage();
  const stored = win(DEFAULT_PROGRESS, 5);
  storage.values.set('cloud-garden:v1', JSON.stringify(stored));
  const store = progressStore(storage);
  assert.equal(store.update(p => win(p)), false);
  assert.equal(storage.writes.length, 0);
  await store.load();
  assert.deepEqual(store.getSnapshot().data, stored);
  assert.equal(storage.writes.length, 0);
});

test('all mode namespaces retain scores, stars, fastest times, unlocks and deaths after remount', async () => {
  const storage = memoryStorage();
  const keys = ['cloud-garden:v1', 'cloud-garden:hardcore:v1', 'cloud-garden:genesis:v1',
    'cloud-garden:void:v1', 'cloud-garden:singularity:v1'];
  for (const [idx, key] of keys.entries()) {
    const store = progressStore(storage, key);
    await store.load();
    store.update(p => win(p, idx, 2000 + idx, 2 + idx));
    store.update(p => ({ ...p, deaths: { [idx]: 2 } }));
    await store.flush();
  }
  for (const [idx, key] of keys.entries()) {
    const restored = progressStore(storage, key);
    await restored.load();
    const p = restored.getSnapshot().data;
    assert.equal(p.unlocked, idx + 1);
    assert.equal(p.stars[idx], 3);
    assert.equal(p.scores[idx], 2000 + idx);
    assert.equal(p.bestTimes[idx], 2 + idx);
    assert.equal(p.deaths[idx], 2);
  }
});

test('rapid synchronous results and setting changes use the latest in-memory snapshot', async () => {
  const storage = memoryStorage();
  const store = progressStore(storage);
  await store.load();
  for (let i = 0; i < 40; i++) store.update(p => win(p, i));
  store.update(p => ({ ...p, settings: { ...p.settings, sound: false } }));
  await store.flush();
  const restored = await loadGameData(storage, 'cloud-garden:v1', DEFAULT_PROGRESS, x => readProgress(x, 100));
  assert.equal(Object.keys(restored.scores).length, 40);
  assert.equal(restored.unlocked, 40);
  assert.equal(restored.settings.sound, false);
  assert.equal(store.getSnapshot().saving, false);
});

test('slow writes finish in order and remount waits for queued data', async () => {
  const storage = memoryStorage();
  const setItem = storage.setItem.bind(storage);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let calls = 0;
  storage.setItem = async (key, value) => {
    if (++calls === 1) await gate;
    return setItem(key, value);
  };
  const store = progressStore(storage);
  await store.load();
  store.update(p => win(p, 0));
  store.update(p => win(p, 1));
  const restored = progressStore(storage);
  const loading = restored.load();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1, 'the second write must not overtake a slow first write');
  assert.equal(restored.getSnapshot().ready, false);
  release();
  await Promise.all([loading, store.flush()]);
  assert.equal(restored.getSnapshot().data.unlocked, 2);
  assert.equal(storage.writes.length, 2);
});

test('failed loading never enables default overwrites; retry restores the old save', async () => {
  const storage = memoryStorage();
  const saved = win(DEFAULT_PROGRESS, 8);
  storage.values.set('cloud-garden:v1', JSON.stringify(saved));
  storage.failRead = true;
  const store = progressStore(storage);
  await store.load();
  assert.equal(store.getSnapshot().ready, false);
  assert.match(store.getSnapshot().storageError, /could not be loaded/);
  assert.equal(store.update(p => win(p)), false);
  assert.equal(storage.writes.length, 0);
  storage.failRead = false;
  await store.flush();
  assert.equal(store.getSnapshot().ready, true);
  assert.deepEqual(store.getSnapshot().data, saved);
  assert.equal(store.getSnapshot().storageError, undefined);
});

test('invalid JSON or invalid root shapes are preserved, not silently reset', async () => {
  for (const raw of ['{broken', 'null', '[]', '5', '""']) {
    const storage = memoryStorage();
    storage.values.set('cloud-garden:v1', raw);
    const store = progressStore(storage);
    await store.load();
    assert.equal(store.getSnapshot().ready, false);
    assert.ok(store.getSnapshot().storageError);
    await store.flush();
    assert.equal(storage.values.get('cloud-garden:v1'), raw);
    assert.equal(storage.writes.length, 0);
  }
});

test('failed writes keep the latest progress in memory, surface errors and allow retry', async () => {
  const storage = memoryStorage();
  const store = progressStore(storage);
  await store.load();
  storage.failWrite = true;
  store.update(p => win(p, 2));
  await store.flush();
  assert.equal(store.getSnapshot().data.unlocked, 3);
  assert.match(store.getSnapshot().storageError, /could not be saved/);
  assert.equal(store.update(p => win(p, 3)), false, 'do not spend or grant through a known storage failure');
  storage.failWrite = false;
  await store.flush();
  assert.equal(store.getSnapshot().storageError, undefined);
  assert.equal(JSON.parse(storage.values.get('cloud-garden:v1')).unlocked, 3);
});

test('reward currencies, inventory and reward counters survive save/load without double-granting', async () => {
  const storage = memoryStorage();
  const key = 'cloud-garden:app-rewards:v1';
  const store = createGameDataStore(storage, key, DEFAULT_APP_REWARDS, readAppRewardProfile);
  await store.load();
  store.update(p => ({ ...p, goldenBrushes: 3, genesisFastPasses: 2, inkCredits: 120 }));
  store.update(recordRewardedHint);
  store.update(p => ({ ...p, inkCredits: p.inkCredits - 20 }));
  await store.flush();
  const restored = await loadGameData(storage, key, DEFAULT_APP_REWARDS, readAppRewardProfile);
  assert.equal(restored.goldenBrushes, 3);
  assert.equal(restored.genesisFastPasses, 2);
  assert.equal(restored.inkCredits, 100);
  assert.equal(restored.rewardedHints, 1);
  assert.equal(restored.rewardedAdsCompleted, 1);
});

test('helper write failures reject, and a failed key does not poison other modes or retries', async () => {
  const storage = memoryStorage();
  storage.failWrite = true;
  await assert.rejects(saveGameData(storage, 'one', { score: 10 }), /disk full/);
  storage.failWrite = false;
  await saveGameData(storage, 'two', { score: 20 });
  await saveGameData(storage, 'one', { score: 30 });
  assert.equal(JSON.parse(storage.values.get('one')).score, 30);
  assert.equal(JSON.parse(storage.values.get('two')).score, 20);
});

test('loading twice is idempotent and existing old-key records need no migration', async () => {
  const storage = memoryStorage();
  storage.values.set('cloud-garden:v1', JSON.stringify({
    unlocked: 1, last: 1, stars: { 0: 3 }, scores: { 0: 400 }, settings: { sound: false },
  }));
  const store = progressStore(storage);
  await Promise.all([store.load(), store.load()]);
  store.update(p => win(p, 1));
  await store.load(); // Effect replay must not restore an older snapshot.
  await store.flush();
  assert.equal(store.getSnapshot().data.unlocked, 2);
  assert.equal(store.getSnapshot().data.scores[0], 400);
  assert.equal(store.getSnapshot().data.settings.sound, false);
  assert.deepEqual([...storage.values.keys()], ['cloud-garden:v1']);
});

test('AsyncStorage is a production dependency with Android native autolinking metadata', () => {
  const pkg = JSON.parse(readFileSync(require.resolve('../package.json'), 'utf8'));
  assert.equal(pkg.dependencies['@react-native-async-storage/async-storage'], '2.2.0');
  const installed = require.resolve('@react-native-async-storage/async-storage/package.json');
  const nativePkg = JSON.parse(readFileSync(installed, 'utf8'));
  assert.equal(nativePkg.codegenConfig.android.javaPackageName, 'com.reactnativecommunity.asyncstorage');
  const source = readFileSync(require('node:path').join(require('node:path').dirname(installed),
    'android/src/javaPackage/java/com/reactnativecommunity/asyncstorage/AsyncStoragePackage.java'), 'utf8');
  assert.match(source, /class AsyncStoragePackage/);
});
