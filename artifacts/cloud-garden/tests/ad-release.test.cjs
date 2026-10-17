const test = require('node:test');
const assert = require('node:assert/strict');
const { adsUseTestUnits } = require('../.physics-test-build/adConfig.js');
test('native development never uses live ads, even with a production flag', () => {
  assert.equal(adsUseTestUnits(true, 'false'), true);
  assert.equal(adsUseTestUnits(true), true);
});
test('release preview uses test ads but the production bundle uses live units', () => {
  assert.equal(adsUseTestUnits(false, 'true'), true);
  assert.equal(adsUseTestUnits(false, 'false'), false);
  assert.equal(adsUseTestUnits(false), false);
});
