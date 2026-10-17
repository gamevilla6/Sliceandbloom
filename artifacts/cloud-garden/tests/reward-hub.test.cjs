const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_APP_REWARDS: empty, readAppRewardProfile } = require('../.physics-test-build/appRewards.js');
const hub = require('../.physics-test-build/rewardHub.js');
const { GardenEngine } = require('../.physics-test-build/engine.js');
const { LEVELS } = require('../.physics-test-build/levels.js');
const day = n => new Date(2026, 9, 1 + n, 12).getTime();
const grant = (p, action, at, roll = .1, id = `ad:${at}`) => hub.grantHubAdReward(p, action, at, id, roll);

test('existing reward profiles migrate without losing brushes, passes or claim dates', () => {
  const p = readAppRewardProfile({ goldenBrushes: 2, genesisFastPasses: 3, dailyClaimDate: '2026-10-01' });
  assert.equal(p.goldenBrushes, 2); assert.equal(p.genesisFastPasses, 3);
  assert.deepEqual(p.skins, ['classic']); assert.equal(p.streakDay, 0);
  assert.equal(hub.dailyStatus(p, day(0)).canClaim, false);
  assert.equal(hub.dailyStatus(p, day(1)).day, 1);
  assert.deepEqual(readAppRewardProfile(p), p);
});
test('seven ad claims escalate and cycle, duplicate receipts and same-day claims do not pay', () => {
  let p = empty;
  for (let i = 0; i < 7; i++) {
    p = grant(p, 'dailyBrush', day(i));
    assert.equal(p.streakDay, i + 1);
    assert.equal(grant(p, 'dailyBrush', day(i), .1, 'different'), p);
    assert.equal(grant(p, 'dailyBrush', day(i + 1), .1, `ad:${day(i)}`), p);
  }
  assert.equal(p.inkRefills, 4); assert.equal(p.goldenBrushes, 3);
  assert.equal(p.genesisSkips, 1); assert.equal(p.levelSkips, 1);
  assert.equal(p.inkCredits, 925); assert.equal(p.rewardedAdsCompleted, 7);
  assert.equal(grant(p, 'dailyBrush', day(7)).streakDay, 1);
  assert.deepEqual(readAppRewardProfile(p), p);
});
test('missed days reset the cycle; a backward clock cannot claim', () => {
  const p = grant(grant(empty, 'dailyBrush', day(0)), 'dailyBrush', day(1));
  assert.equal(hub.dailyStatus(p, day(0)).canClaim, false);
  assert.equal(grant(p, 'dailyBrush', day(0)), p);
  assert.equal(hub.dailyStatus(p, day(3)).day, 1);
  assert.equal(grant(p, 'dailyBrush', day(3)).streakDay, 1);
});
test('all vault tiers share one hourly gate; exactly at expiry is eligible', () => {
  const p = grant(empty, 'vaultBronze', day(0), 0);
  assert.equal(p.infiniteInkUntil, day(0) + 300000);
  assert.equal(grant(p, 'vaultGold', day(0) + 3599999, .6), p);
  const next = grant(p, 'vaultSilver', day(0) + 3600000, .5);
  assert.equal(next.levelSkips, 1); assert.equal(next.rewardedAdsCompleted, 2);
});
test('every advertised vault prize and skin is reachable, duplicates give exactly 100 ink', () => {
  for (const [tier, odds] of Object.entries(hub.VAULT_ODDS)) {
    const action = `vault${tier[0].toUpperCase()}${tier.slice(1)}`;
    assert.ok(grant(empty, action, day(0), 0).infiniteInkUntil > day(0));
    assert.equal(grant(empty, action, day(0), (odds.infinite + 1) / 100).levelSkips, 1);
    for (let i = 0; i < 3; i++) {
      const roll = (odds.infinite + odds.skip + odds.skin * (i + .5) / 3) / 100;
      const p = grant(empty, action, day(0), roll);
      assert.ok(p.skins.includes(hub.SKINS[i + 1].id));
      const dup = grant(p, action, day(0) + 3600000, roll);
      assert.equal(dup.inkCredits, 100); assert.equal(dup.skins.length, 2);
    }
  }
});
test('wheel debit and payout are atomic, idempotent and use exact 40/40/18/2 boundaries', () => {
  assert.equal(hub.spinInkRush(empty, day(0), 'no-credit'), empty);
  for (const [roll, expected, index] of [[0, 0, 0], [.3999, 0, 0], [.4, 40, 1], [.8, 100, 2], [.98, 500, 3]]) {
    const p = hub.spinInkRush({ ...empty, inkCredits: 20 }, day(0), 'spin', false, roll);
    assert.equal(p.inkCredits, expected); assert.equal(p.history[0].wheelIndex, index);
    assert.equal(p.rewardedAdsCompleted, 0);
    assert.equal(hub.spinInkRush(p, day(0), 'spin', false, .99), p);
  }
});
test('ad spin takes no wager and guarantees 10 credits even with no multiplier', () => {
  const p = grant(empty, 'wheelAd', day(0), 0);
  assert.equal(p.inkCredits, 10); assert.equal(p.rewardedAdsCompleted, 1);
  assert.equal(grant(p, 'wheelAd', day(1), .99, `ad:${day(0)}`), p);
});
test('only owned skins equip; inventory cannot be consumed below zero', () => {
  assert.equal(hub.equipRewardSkin(empty, 'lava'), empty);
  const owned = { ...empty, skins: ['classic', 'lava'] };
  assert.equal(hub.equipRewardSkin(owned, 'lava').equippedSkin, 'lava');
  assert.equal(hub.consumeHubItem(empty, 'inkRefills'), empty);
  assert.equal(hub.consumeHubItem({ ...empty, inkRefills: 1 }, 'inkRefills').inkRefills, 0);
});
test('skip consumption saves recovery entitlement and does not invent completions', () => {
  const p = { ...empty, genesisSkips: 1 };
  assert.equal(hub.consumeSkip(p, true, 'classic', 0, 100), p);
  assert.equal(hub.consumeSkip(p, true, 'genesis', 99, 100), p);
  const used = hub.consumeSkip(p, true, 'genesis', 0, 100);
  assert.equal(used.genesisSkips, 0); assert.equal(used.skipUnlocks.genesis, 1);
  assert.deepEqual(readAppRewardProfile(used), used);
  assert.equal(hub.consumeSkip(used, true, 'genesis', 1, 100), used);
  const cleared = hub.clearSkipEntitlement(used, 'genesis');
  assert.equal(cleared.skipUnlocks.genesis, undefined);
  assert.equal(cleared.genesisSkips, 0); // resetting progress is not a token refund
});
test('malformed hub inventory is bounded and falls back to an owned classic skin', () => {
  const p = readAppRewardProfile({ inkCredits: -4, streakDay: 99, skins: ['unknown', 'lava', 'lava'],
    equippedSkin: 'neon', vaultNextAt: Infinity, receipts: [3, 'ok'], skipUnlocks: { classic: 3, evil: 100 } });
  assert.equal(p.inkCredits, 0); assert.equal(p.streakDay, 7); assert.equal(p.vaultNextAt, 0);
  assert.equal(p.equippedSkin, 'classic'); assert.deepEqual(p.skins, ['classic', 'lava']);
  assert.deepEqual(p.skipUnlocks, { classic: 3 }); assert.deepEqual(p.receipts, ['ok']);
});
test('timed unlimited ink can expire in place without resetting physics and is body-count bounded', () => {
  const e = new GardenEngine(LEVELS[0]);
  const base = e.inkMax; const id = e.drop.id;
  e.infiniteInk = true;
  assert.ok(e.inkMax > base);
  assert.equal(e.addStroke(Array.from({ length: 161 }, (_, i) => ({ x: i * 2, y: 250 }))), false);
  assert.equal(e.addStroke([{ x: 40, y: 250 }, { x: 240, y: 250 }]), true);
  e.infiniteInk = false;
  assert.equal(e.inkMax, base); assert.equal(e.drop.id, id); assert.equal(e.strokes.length, 1);
  assert.ok(Number.isFinite(e.score)); e.dispose();
});
