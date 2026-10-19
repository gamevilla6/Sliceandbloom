const test = require('node:test');
const assert = require('node:assert/strict');
const { readProgress } = require('../.physics-test-build/progress.js');
const { mergeCloudProgress, parseCloudProgress, toCloudProgress } = require('../.physics-test-build/cloudProgress.js');

test('private cloud hydration merges best scores and stars without replacing local preferences or deaths', () => {
  const local = readProgress({
    unlocked: 2, last: 1, stars: { 0: 1 }, scores: { 0: 12 }, bestTimes: { 0: 30 },
    deaths: { 0: 4 }, settings: { haptics: true, guides: false, sound: false },
  }, 100);
  const remote = {
    unlocked: 4, last: 3, stars: { 0: 2, 3: 3 }, scores: { 0: 18, 3: 90 },
    bestTimes: { 0: 25, 3: 40 },
  };
  const merged = mergeCloudProgress(local, remote, 100);
  assert.equal(merged.unlocked, 4);
  assert.equal(merged.last, 1);
  assert.deepEqual(merged.stars, { 0: 2, 3: 3 });
  assert.deepEqual(merged.scores, { 0: 18, 3: 90 });
  assert.deepEqual(merged.bestTimes, { 0: 25, 3: 40 });
  assert.equal(merged.deaths['0'], 4);
  assert.equal(merged.settings.sound, false);
  assert.equal(merged.settings.guides, false);
});

test('first cloud restore takes the server last-played level and projection omits device-only fields', () => {
  const empty = readProgress(null, 55);
  const restored = mergeCloudProgress(empty, {
    unlocked: 7, last: 5, stars: { 4: 2 }, scores: {}, bestTimes: {},
  }, 55);
  assert.equal(restored.last, 5);
  assert.deepEqual(toCloudProgress(restored), {
    unlocked: 7, last: 5, stars: { 4: 2 }, scores: {}, bestTimes: {},
  });
  assert.equal('settings' in toCloudProgress(restored), false);
  assert.equal('deaths' in toCloudProgress(restored), false);
});

test('cloud response validation rejects out-of-range levels and malformed records', () => {
  const valid = { unlocked: 54, last: 54, stars: { 53: 3 }, scores: { 53: 120 }, bestTimes: { 53: 4.5 } };
  assert.deepEqual(parseCloudProgress('singularity', valid), valid);
  assert.throws(() => parseCloudProgress('singularity', { ...valid, unlocked: 55 }));
  assert.throws(() => parseCloudProgress('singularity', { ...valid, stars: { 56: 3 } }));
  assert.throws(() => parseCloudProgress('singularity', { ...valid, last: 55 }));
});
