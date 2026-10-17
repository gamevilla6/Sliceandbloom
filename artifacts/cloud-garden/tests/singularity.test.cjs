const assert = require('node:assert/strict');
const { test } = require('node:test');
const Matter = require('matter-js');
const { GardenEngine } = require('../.physics-test-build/engine.js');
const { INFINITY_LEVELS } = require('../.physics-test-build/infinityLevels.js');
const { LEVELS } = require('../.physics-test-build/levels.js');
const { SINGULARITY_LEVELS } = require('../.physics-test-build/singularityLevels.js');
const { readProgress } = require('../.physics-test-build/progress.js');

function solve(level) {
  const g = new GardenEngine(level);
  g.attach();
  let contacts = 0;
  Matter.Events.on(g.engine, 'collisionStart', ({ pairs }) => {
    if (pairs.some(({ bodyA, bodyB }) =>
      (bodyA === g.drop && bodyB === g.plant) || (bodyB === g.drop && bodyA === g.plant))) contacts++;
  });
  let valid = true;
  for (const hint of level.hint) {
    valid &&= g.beginInput();
    if (hint.kind === 'draw') valid &&= g.addStroke(hint.pts);
    else {
      let cuts = 0;
      for (let i = 1; i < hint.pts.length; i++) cuts += g.slice(hint.pts[i - 1], hint.pts[i]);
      valid &&= cuts > 0;
      g.endSlice();
    }
    for (let i = 0; i < 30; i++) g.step();
  }
  if (level.hint.some(h => h.kind === 'slice')) for (let i = 0; i < 90; i++) g.step();
  valid &&= g.release();
  for (let i = 0; i < 1800 && g.status === 'running'; i++) g.step();
  const result = { won: valid && contacts > 0 && g.status === 'won', score: g.score, status: g.status, fail: g.failReason };
  g.dispose();
  return result;
}

test('Singularity Paradox has 55 independent themed layouts with isolated progress records', () => {
  assert.equal(SINGULARITY_LEVELS.length, 55);
  assert.deepEqual(SINGULARITY_LEVELS.map(l => l.id), Array.from({ length: 55 }, (_, i) => i + 1));
  assert.equal(new Set(SINGULARITY_LEVELS.map(l => l.name)).size, 55);
  assert.equal(new Set(SINGULARITY_LEVELS.map(l => JSON.stringify([l.drop, l.flower, l.wood, l.hint, l.portals]))).size, 55);
  for (const l of SINGULARITY_LEVELS) {
    assert.equal(l.visualMode, 'singularity');
    assert.ok(l.hardcore.timeLimit > 0);
    assert.ok(l.hardcore.gravityScale > 1);
  }
  for (const source of INFINITY_LEVELS) {
    assert.ok(!SINGULARITY_LEVELS.includes(source));
    assert.ok(SINGULARITY_LEVELS.every(l => l.wood !== source.wood));
  }
  const campaignProgress = readProgress({ stars: { 0: 3 }, unlocked: 1 }, 100);
  const singularityProgress = readProgress(null, 55);
  assert.equal(campaignProgress.stars[0], 3);
  assert.equal(singularityProgress.unlocked, 0);
  assert.deepEqual(singularityProgress.stars, {});
});

for (const level of SINGULARITY_LEVELS) {
  test(`Singularity ${level.id}: ${level.name} completes using its actual hint routes`, () => {
    const result = solve(level);
    assert.ok(result.won, `${result.status}: ${result.fail || 'no flower collision'}`);
    assert.ok(result.score > 0);
  });
}

test('Singularity challenges remain separate from the 100-bed campaign array', () => {
  assert.equal(LEVELS.length, 100);
  assert.deepEqual(LEVELS.slice(45).map(l => l.id), INFINITY_LEVELS.map(l => l.id));
  assert.notEqual(SINGULARITY_LEVELS[0], INFINITY_LEVELS[0]);
});
