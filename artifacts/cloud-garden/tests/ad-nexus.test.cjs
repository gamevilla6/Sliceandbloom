const test = require('node:test');
const assert = require('node:assert/strict');
const { AdManagerCore, AD_CADENCE_KEY, AD_CACHE_MS } = require('../.physics-test-build/AdManagerCore.js');
const { ANDROID_AD_UNITS, ANDROID_ADMOB_APP_ID } = require('../.physics-test-build/adConfig.js');
const tick = () => new Promise(resolve => setImmediate(resolve));

// This is an isolated SDK-port mock, never exposed to the app or web preview.
class FakeAd {
  listeners = new Map(); shows = 0; loads = 0; destroyed = false; rejectShow = false; throwShow = false;
  on(event, fn) {
    const set = this.listeners.get(event) ?? new Set(); set.add(fn); this.listeners.set(event, set);
    return () => set.delete(fn);
  }
  emit(event, payload) { [...(this.listeners.get(event) ?? [])].forEach(fn => fn(payload)); }
  load() { this.loads++; }
  show() {
    this.shows++;
    if (this.throwShow) throw new Error('synchronous SDK error');
    return this.rejectShow ? Promise.reject(new Error('show failed')) : Promise.resolve();
  }
  destroy() { this.destroyed = true; this.listeners.clear(); }
}
async function fixture(t, saved) {
  const data = new Map(saved ? [[AD_CADENCE_KEY, JSON.stringify(saved)]] : []);
  const ads = { rewarded: [], interstitial: [] };
  const storage = { getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); } };
  const adapter = { initialize: async () => {}, create: kind => { const ad = new FakeAd(); ads[kind].push(ad); return ad; } };
  let now = 1000000;
  const manager = new AdManagerCore(adapter, storage, () => now);
  t.after(() => manager.dispose());
  await manager.start(); await tick();
  return { manager, data, ads, storage, adapter, advance: ms => { now += ms; },
    ad: kind => ads[kind].at(-1),
    load: kind => ads[kind].at(-1).emit('loaded') };
}

test('Android production IDs match the supplied app, banner, interstitial and rewarded units', () => {
  assert.equal(ANDROID_ADMOB_APP_ID, 'ca-app-pub-3691647720194867~6693245246');
  assert.deepEqual(ANDROID_AD_UNITS, { banner: 'ca-app-pub-3691647720194867/1485150592',
    interstitial: 'ca-app-pub-3691647720194867/5016456636', rewarded: 'ca-app-pub-3691647720194867/7981531326' });
  const app = require('../app.json');
  assert.equal(app.expo.plugins.find(p => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads')[1].androidAppId, ANDROID_ADMOB_APP_ID);
});
test('startup preloads both fullscreen formats, never shows one automatically, and deduplicates loads', async t => {
  const f = await fixture(t);
  assert.equal(f.ad('rewarded').loads, 1); assert.equal(f.ad('interstitial').loads, 1);
  f.manager.preload('rewarded'); f.manager.preload('interstitial');
  await tick();
  assert.equal(f.ads.rewarded.length, 1); assert.equal(f.ad('rewarded').shows, 0);
  assert.equal(f.ad('interstitial').shows, 0);
});

test('offline gate blocks cached ads and preserves an already-earned reward on close', async t => {
  const f = await fixture(t);
  f.load('rewarded');
  f.manager.setOnline(false);
  assert.equal(f.manager.showRewarded(() => assert.fail('offline ad must not reward')), false);
  assert.equal(f.ad('rewarded').shows, 0);
  f.manager.setOnline(true);
  const earned = [];
  assert.equal(f.manager.showRewarded(reward => earned.push(reward)), true);
  f.ad('rewarded').emit('earned', { type: 'hint', amount: 1 });
  f.manager.setOnline(false);
  assert.equal(earned.length, 0);
  f.ad('rewarded').emit('closed');
  assert.equal(earned.length, 1);
  assert.equal(f.ads.rewarded.length, 1); // No new load while offline.
});

test('offline incomplete ads do not reward and reconnect retries failed preloads', async t => {
  const f = await fixture(t);
  f.load('rewarded');
  const earned = [];
  f.manager.showRewarded(reward => earned.push(reward));
  f.manager.setOnline(false);
  f.ad('rewarded').emit('closed');
  assert.equal(earned.length, 0);
  f.manager.setOnline(true);
  await tick();
  assert.equal(f.ads.rewarded.length, 2);
});
test('reward is granted once only after showing, earned AND closed, then a replacement preloads', async t => {
  const f = await fixture(t); f.load('rewarded');
  const ad = f.ad('rewarded'), reward = { amount: 1, type: 'ink' };
  const staleClosed = [...ad.listeners.get('closed')][0];
  let grants = 0;
  assert.equal(f.manager.showRewarded(r => { assert.deepEqual(r, reward); grants++; }), true);
  ad.emit('earned', reward); ad.emit('earned', { amount: 99, type: 'duplicate' });
  assert.equal(grants, 0);
  ad.emit('closed'); staleClosed(); ad.emit('closed');
  assert.equal(grants, 1); assert.equal(f.manager.getSnapshot().fullscreen, null);
  await tick(); assert.equal(f.ads.rewarded.length, 2);
});
test('early close, earned-before-show and SDK error after earned do not grant inventory', async t => {
  const f = await fixture(t); let grants = 0;
  f.load('rewarded'); f.ad('rewarded').emit('earned', { amount: 1, type: 'early' });
  f.manager.showRewarded(() => grants++); f.ad('rewarded').emit('closed');
  assert.equal(grants, 0);
  await tick(); f.load('rewarded');
  f.manager.showRewarded(() => grants++); const ad = f.ad('rewarded');
  ad.emit('earned', { amount: 1, type: 'ink' }); ad.emit('error'); ad.emit('closed');
  assert.equal(grants, 0); assert.equal(f.manager.getSnapshot().fullscreen, null);
});
test('wins 3 and 6 permit one interstitial at the result break, never wins 1, 2, 4 or 5', async t => {
  const f = await fixture(t); f.load('interstitial'); let shown = 0;
  for (let i = 1; i <= 6; i++) {
    const key = `session:mode:win${i}`;
    await f.manager.recordCompletion(key);
    await f.manager.recordCompletion(key); // duplicate React effect
    const pending = f.manager.interstitialAtVictoryBreak(key);
    await tick();
    if (i % 3 === 0) {
      const ad = f.ad('interstitial'); assert.equal(ad.shows, 1); shown++;
      assert.equal(await f.manager.interstitialAtVictoryBreak(key), false);
      ad.emit('closed'); assert.equal(await pending, true);
      await tick(); f.load('interstitial');
    } else assert.equal(await pending, false);
  }
  assert.equal(shown, 2); assert.equal(f.manager.getSnapshot().completionCount, 6);
  await tick(); assert.equal(JSON.parse(f.data.get(AD_CADENCE_KEY)).count, 6);
});
test('a missed third-win no-fill is consumed, never shown later during a fourth win', async t => {
  const f = await fixture(t);
  for (let i = 1; i <= 3; i++) await f.manager.recordCompletion(`a${i}`);
  assert.equal(await f.manager.interstitialAtVictoryBreak('a3'), false);
  f.load('interstitial');
  assert.equal(await f.manager.interstitialAtVictoryBreak('a3'), false);
  await f.manager.recordCompletion('a4');
  assert.equal(await f.manager.interstitialAtVictoryBreak('a4'), false);
  assert.equal(f.ad('interstitial').shows, 0);
});
test('persisted counter resumes across sessions without showing an old milestone on launch', async t => {
  const f = await fixture(t, { count: 3, seen: ['old3'] }); f.load('interstitial');
  assert.equal(await f.manager.interstitialAtVictoryBreak('old3'), false);
  await f.manager.recordCompletion('new4'); await f.manager.recordCompletion('new5');
  assert.equal(await f.manager.interstitialAtVictoryBreak('new5'), false);
  await f.manager.recordCompletion('new6');
  const pending = f.manager.interstitialAtVictoryBreak('new6'); await tick();
  f.ad('interstitial').emit('closed'); assert.equal(await pending, true);
  assert.equal(f.manager.getSnapshot().completionCount, 6);
});
test('fullscreen mutex prevents interstitial/rewarded overlap, and skips a busy opportunity', async t => {
  const f = await fixture(t); f.load('rewarded'); f.load('interstitial');
  assert.equal(f.manager.showRewarded(() => {}), true);
  assert.equal(f.manager.showRewarded(() => {}), false);
  for (let i = 1; i <= 3; i++) await f.manager.recordCompletion(`busy${i}`);
  assert.equal(await f.manager.interstitialAtVictoryBreak('busy3'), false);
  assert.equal(f.ad('interstitial').shows, 0);
  f.ad('rewarded').emit('closed');
  assert.equal(await f.manager.interstitialAtVictoryBreak('busy3'), false);
});
test('sync and async show failures release the transition without a reward or deadlock', async t => {
  for (const sync of [false, true]) {
    const f = await fixture(t); f.load('interstitial');
    for (let i = 1; i <= 3; i++) await f.manager.recordCompletion(`fail${sync}:${i}`);
    f.ad('interstitial').rejectShow = !sync; f.ad('interstitial').throwShow = sync;
    assert.equal(await f.manager.interstitialAtVictoryBreak(`fail${sync}:3`), false);
    assert.equal(f.manager.getSnapshot().fullscreen, null);
  }
});
test('expired cached ads are reloaded instead of shown, background never starts a fullscreen ad', async t => {
  const f = await fixture(t); f.load('rewarded'); f.load('interstitial');
  f.advance(AD_CACHE_MS + 1);
  assert.equal(f.manager.showRewarded(() => assert.fail('stale reward')), false);
  await tick(); assert.equal(f.ads.rewarded.length, 2);
  f.manager.setAppActive(false);
  assert.equal(f.manager.showRewarded(() => {}), false);
  for (let i = 1; i <= 3; i++) await f.manager.recordCompletion(`bg${i}`);
  assert.equal(await f.manager.interstitialAtVictoryBreak('bg3'), false);
  f.manager.setAppActive(true); await tick();
  assert.equal(f.ad('interstitial').shows, 0);
});
test('load timeout and repeated SDK failures stop after bounded background retries', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = await fixture(t);
  f.ad('rewarded').emit('error');
  t.mock.timers.tick(15001); await tick();
  f.ad('rewarded').emit('error');
  t.mock.timers.tick(30001); await tick();
  f.ad('rewarded').emit('error');
  const n = f.ads.rewarded.length;
  t.mock.timers.tick(300000); await tick();
  assert.equal(f.ads.rewarded.length, n);
  f.manager.preload('rewarded', true); await tick();
  assert.equal(f.ads.rewarded.length, n + 1);
  t.mock.timers.tick(15001); await tick();
  assert.equal(f.manager.getSnapshot().rewarded, 'unavailable');
  f.manager.dispose();
  t.mock.timers.reset();
});
test('storage failure skips forced ads rather than risking the persisted cadence', async t => {
  const f = await fixture(t); f.load('interstitial');
  f.storage.setItem = async () => { throw new Error('storage full'); };
  for (let i = 1; i <= 3; i++) await f.manager.recordCompletion(`disk${i}`);
  await tick();
  assert.ok(f.manager.getSnapshot().storageError);
  assert.equal(await f.manager.interstitialAtVictoryBreak('disk3'), false);
});
test('web adapter never shows fake ads or grants rewarded inventory', async t => {
  const storage = { getItem: async () => null, setItem: async () => {} };
  const manager = new AdManagerCore(null, storage); t.after(() => manager.dispose());
  await manager.start();
  assert.equal(manager.getSnapshot().supported, false);
  assert.equal(manager.showRewarded(() => assert.fail('fake web reward')), false);
  for (let i = 0; i < 3; i++) await manager.recordCompletion(`web${i}`);
  assert.equal(await manager.interstitialAtVictoryBreak('web2'), false);
});
