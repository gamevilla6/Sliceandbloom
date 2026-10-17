const test = require('node:test');
const assert = require('node:assert/strict');
const rewards = require('../.physics-test-build/appRewards.js');
const { GardenEngine } = require('../.physics-test-build/engine.js');
const { LEVELS } = require('../.physics-test-build/levels.js');

test('daily brush claim is once per local day and survives profile parsing', () => {
  const day = rewards.localRewardDay(new Date(2026, 9, 17));
  const first = rewards.claimDailyGoldenBrush(rewards.DEFAULT_APP_REWARDS, day);
  assert.equal(first.goldenBrushes, 1);
  assert.equal(first.rewardedAdsCompleted, 1);
  assert.equal(rewards.claimDailyGoldenBrush(first, day), first);
  assert.equal(rewards.claimDailyGoldenBrush(first, '2026-10-18').goldenBrushes, 2);
  assert.deepEqual(rewards.readAppRewardProfile(first), first);
});

test('fast-pass and rewarded statistics are granted only through explicit reward transitions', () => {
  const untouched = rewards.DEFAULT_APP_REWARDS;
  const granted = rewards.grantGenesisFastPass(untouched);
  assert.equal(granted.genesisFastPasses, 1);
  assert.equal(granted.rewardedAdsCompleted, 1);
  assert.equal(rewards.consumeGenesisFastPass(granted).genesisFastPasses, 0);
  assert.equal(rewards.consumeGenesisFastPass(untouched), untouched);
  assert.equal(rewards.recordRewardedHint(untouched).rewardedAdsCompleted, 1);
  assert.equal(rewards.recordRewardedInkRetry(untouched).rewardedInkRetries, 1);
});

test('a golden-brush retry adds half the level ink budget without changing normal levels', () => {
  const regular = new GardenEngine(LEVELS[0]);
  const boosted = new GardenEngine(LEVELS[0], 0.5);
  assert.equal(boosted.inkMax, Math.round(regular.inkMax * 1.5));
  regular.dispose();
  boosted.dispose();
});
