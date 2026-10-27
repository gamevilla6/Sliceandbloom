const test = require('node:test');
const assert = require('node:assert/strict');
const { createInternetProbeTarget, InternetAccess } = require('../.physics-test-build/internetAccess.js');

test('reachability checks the configured game API instead of the Pages origin', () => {
  const target = createInternetProbeTarget(
    'https://cloud-to-plant-physics-puzzle.replit.app/api',
    'https://gamevilla6.github.io',
  );
  assert.equal(target.url, 'https://cloud-to-plant-physics-puzzle.replit.app/api/healthz');
  assert.equal(target.expectedStatus, 200);
});

test('web reachability falls back to the app API path when no API is configured', () => {
  const target = createInternetProbeTarget(undefined, 'https://gamevilla6.github.io');
  assert.equal(target.url, 'https://gamevilla6.github.io/api/healthz');
  assert.equal(target.expectedStatus, 200);
});

test('launch fails closed until a real reachability check succeeds', async () => {
  let finish;
  const access = new InternetAccess(() => new Promise(resolve => { finish = resolve; }));
  assert.equal(access.isOnline(), false);
  const request = access.check(true);
  await Promise.resolve();
  assert.equal(access.getSnapshot().status, 'checking');
  finish(true);
  assert.equal(await request, true);
  assert.equal(access.isOnline(), true);
});

test('failed or rejected requests block play and retry can recover', async () => {
  let result = false;
  const access = new InternetAccess(async () => result);
  assert.equal(await access.check(true), false);
  assert.equal(access.getSnapshot().status, 'offline');
  result = true;
  assert.equal(await access.check(true), true);
  const rejected = new InternetAccess(async () => { throw Error('DNS failed'); });
  assert.equal(await rejected.check(true), false);
  assert.equal(rejected.isOnline(), false);
});

test('unresponsive requests time out rather than leaving Retry stuck', async () => {
  const access = new InternetAccess(() => new Promise(() => {}), 10);
  assert.equal(await access.check(true), false);
  assert.equal(access.getSnapshot().status, 'offline');
});

test('concurrent starts share one check and every fresh start checks again', async () => {
  let calls = 0;
  const access = new InternetAccess(async () => { calls++; return true; });
  const a = access.check(true);
  const b = access.check(true);
  assert.equal(a, b);
  await Promise.all([a, b]);
  assert.equal(calls, 1);
  await access.check(true);
  assert.equal(calls, 2);
});

test('Retry forces a fresh check and ignores an older in-flight result', async () => {
  const finishes = [];
  const access = new InternetAccess(() => new Promise(resolve => { finishes.push(resolve); }));
  const background = access.check();
  await Promise.resolve();
  const retry = access.check(true, true);
  await Promise.resolve();
  assert.equal(finishes.length, 2);
  finishes[1](true);
  assert.equal(await retry, true);
  finishes[0](false);
  assert.equal(await background, false);
  assert.equal(access.isOnline(), true);
});

test('disconnect invalidates an older successful response', async () => {
  let finish;
  const access = new InternetAccess(() => new Promise(resolve => { finish = resolve; }));
  const old = access.check(true);
  await Promise.resolve();
  access.disconnect();
  finish(true);
  assert.equal(await old, false);
  assert.equal(access.getSnapshot().status, 'offline');
});

test('a stale network cannot override a new network or foreground check', async () => {
  const finishes = [];
  const access = new InternetAccess(() => new Promise(resolve => { finishes.push(resolve); }));
  const old = access.check(true);
  await Promise.resolve();
  access.suspend();
  const current = access.check(true);
  await Promise.resolve();
  finishes[1](true);
  assert.equal(await current, true);
  finishes[0](false);
  assert.equal(await old, false);
  assert.equal(access.isOnline(), true);
});

test('background checks do not flicker but an explicit start blocks pending proof', async () => {
  let finish;
  let first = true;
  const access = new InternetAccess(() => first ? (first = false, Promise.resolve(true))
    : new Promise(resolve => { finish = resolve; }));
  await access.check(true);
  const background = access.check();
  assert.equal(access.isOnline(), true);
  const start = access.check(true);
  assert.equal(access.isOnline(), false);
  await Promise.resolve();
  finish(false);
  assert.equal(await background, false);
  assert.equal(await start, false);
});
