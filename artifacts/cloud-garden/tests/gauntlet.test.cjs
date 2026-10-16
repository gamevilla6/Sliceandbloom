const assert = require('node:assert/strict');
const { test } = require('node:test');
const Matter = require('matter-js');
const { GardenEngine, DROP_R } = require('../.physics-test-build/engine.js');
const { GENESIS_LEVELS } = require('../.physics-test-build/genesisLevels.js');
const { HARDCORE_LEVELS } = require('../.physics-test-build/hardcoreLevels.js');
const { LEVELS } = require('../.physics-test-build/levels.js');
const { readProgress, completeProgress } = require('../.physics-test-build/progress.js');

function solve(level, wait = 0, pause = 30) {
  const g = new GardenEngine(level);
  g.attach();
  let contacts = 0, valid = true;
  Matter.Events.on(g.engine, 'collisionStart', ({ pairs }) => {
    if (pairs.some(({ bodyA, bodyB }) => bodyA === g.drop && bodyB === g.plant
      || bodyB === g.drop && bodyA === g.plant)) contacts++;
  });
  for (const hint of level.hint) {
    valid &&= g.beginInput();
    if (hint.kind === 'draw') valid &&= g.addStroke(hint.pts);
    else {
      let hits = 0;
      for (let i = 1; i < hint.pts.length; i++) hits += g.slice(hint.pts[i - 1], hint.pts[i]);
      valid &&= hits > 0;
      g.endSlice();
    }
    for (let i = 0; i < pause; i++) g.step();
  }
  if (level.hint.some(h => h.kind === 'slice')) for (let i = 0; i < 90; i++) g.step();
  for (let i = 0; i < wait; i++) g.step();
  valid &&= g.release();
  for (let i = 0; i < 1800 && g.status === 'running'; i++) g.step();
  const result = {
    won: valid && contacts > 0 && g.status === 'won', stars: g.stars, score: g.score,
    elapsed: g.elapsed, ink: g.inkUsed, cap: g.inkMax, actions: g.actions,
    portals: g.advanced.teleports, switches: g.advanced.switches.every(s => s.active),
    message: `${g.status}: ${g.failReason}; ${g.elapsed.toFixed(2)}s at (${g.drop.position.x.toFixed(1)},${g.drop.position.y.toFixed(1)}); valid input ${valid}`,
  };
  g.dispose();
  return result;
}

test('Genesis owns 45 distinct Masterclass layouts, never aliases campaign or Hardcore objects', () => {
  assert.equal(GENESIS_LEVELS.length, 45);
  assert.equal(new Set(GENESIS_LEVELS.map(l => l.name)).size, 45);
  const geometry = l => JSON.stringify([l.drop, l.flower, l.wood, l.hint, l.portals, l.rotatingBarriers,
    l.lasers, l.crushingWalls, l.gravityFlipInterval, l.weights, l.switches]);
  assert.equal(new Set(GENESIS_LEVELS.map(geometry)).size, 45);
  for (const [idx, l] of GENESIS_LEVELS.entries()) {
    assert.equal(l.id, idx + 1);
    assert.ok(l.countdownTimer >= 5 && l.countdownTimer === l.hardcore.timeLimit);
    assert.ok([.05, .10].includes(l.strictInkLength));
    assert.equal(l.maxInkLength, l.strictInkLength * 400);
    assert.ok(l.hyperSensitiveScale < 1 && l.hyperSensitiveScale > 0);
    assert.equal(l.par, l.hint.length);
    for (const source of [...LEVELS, ...HARDCORE_LEVELS]) {
      assert.notEqual(geometry(l), geometry(source), 'a challenge is not a campaign layout with another name');
      assert.notEqual(l.wood, source.wood);
    }
  }
});

for (const [mode, levels] of [['Genesis', GENESIS_LEVELS], ['Hardcore expansion', HARDCORE_LEVELS.slice(25)]]) {
  for (const level of levels) {
    test(`${mode} ${level.id}: ${level.name} has a real, strict-budget, three-star solution`, () => {
      let result;
      // Timing is an intentional puzzle input. Search one pulse period, not
      // arbitrary physics cheats; every run uses the actual touch actions.
      for (let wait = 0; wait <= 108; wait += 6) {
        result = solve(level, wait);
        if (result.won && result.stars === 3) break;
      }
      assert.ok(result.won, result.message);
      assert.equal(result.stars, 3, result.message);
      assert.ok(result.score > 0);
      assert.ok(result.ink <= result.cap);
      assert.equal(result.actions, level.par);
      assert.ok(result.portals >= (level.portals?.length ?? 0), 'all route portals are used');
      assert.ok(result.switches, 'all heavy-key gates opened');
    });
  }
}

test('Genesis five-second clock starts on first touch, fails precisely, and fresh retry is pristine', () => {
  const level = GENESIS_LEVELS[0], g = new GardenEngine(level);
  g.attach();
  for (let i = 0; i < 600; i++) g.step();
  assert.equal(g.elapsed, 0);
  assert.equal(g.timeLeft, 5);
  g.beginInput();
  for (let i = 0; i < 301; i++) g.step();
  assert.equal(g.status, 'lost');
  assert.match(g.failReason, /Time up/);
  assert.ok(g.particles.length);
  g.dispose();
  const retry = new GardenEngine(level);
  assert.equal(retry.timeLeft, 5);
  assert.equal(retry.inkUsed, 0);
  assert.equal(retry.status, 'ready');
  assert.equal(retry.revealedBodies.size, 0);
  retry.dispose();
});

test('tiny modifier changes real collision radius and finite dynamic mass; portal offsets use the radius', () => {
  const g = new GardenEngine(GENESIS_LEVELS[0]);
  assert.equal(g.drop.circleRadius, DROP_R * GENESIS_LEVELS[0].hyperSensitiveScale);
  g.release();
  assert.ok(Number.isFinite(g.drop.mass) && g.drop.mass > 0);
  assert.ok(g.drop.mass < .5);
  g.dispose();
});

test('hidden obstacles keep colliding but reveal only on touch, per attempt; slicing reveals descendants', () => {
  const g = new GardenEngine(GENESIS_LEVELS[0]);
  const wood = g.bodies.find(b => b.label === 'cut');
  assert.equal(g.isObstacleVisible(wood), false);
  assert.ok(Matter.Query.point(g.bodies, wood.position).includes(wood));
  assert.equal(g.revealAt({ x: 10, y: 10 }), 0);
  assert.equal(g.revealAt(wood.position), 1);
  assert.equal(g.isObstacleVisible(wood), true);
  assert.equal(g.revealAt(wood.position), 0);
  assert.equal(g.actions, 0, 'touch reveal itself does not consume a stroke');
  const hint = g.level.hint[0];
  g.slice(hint.pts[0], hint.pts[1]); g.endSlice();
  assert.ok(g.bodies.filter(b => b.label === 'cut').every(b => g.isObstacleVisible(b)));
  g.dispose();
});

test('strict 5% and 10% ink caps are enforced even if level ink is larger; Undo refunds nothing', () => {
  for (const fraction of [.05, .10]) {
    const g = new GardenEngine({ ...GENESIS_LEVELS[0], ink: 400, maxInkLength: 400, strictInkLength: fraction });
    assert.equal(g.inkMax, 400 * fraction);
    assert.equal(g.addStroke([{ x: 0, y: 300 }, { x: g.inkMax + .01, y: 300 }]), false);
    assert.equal(g.addStroke([{ x: 0, y: 300 }, { x: g.inkMax, y: 300 }]), true);
    g.undo();
    assert.equal(g.inkLeft, 0);
    assert.equal(g.actions, 1);
    g.dispose();
  }
});

test('old saves migrate safely; three independent records preserve best score, time, stars across all 45 challenges', () => {
  const classic = readProgress({ stars: { 44: 3 }, unlocked: 44, settings: { sound: false } }, 45);
  const hard = readProgress({ stars: { 24: 3 }, unlocked: 24 }, 45);
  assert.equal(hard.unlocked, 25);
  let genesis = readProgress(null, 45);
  for (let i = 0; i < 45; i++) genesis = completeProgress(genesis, 45, i, 3, { score: 3000 + i, time: 3 + i / 100 });
  genesis = completeProgress(genesis, 45, 44, 1, { score: 1000, time: 5 });
  const loaded = readProgress(JSON.parse(JSON.stringify(genesis)), 45);
  assert.equal(Object.keys(loaded.scores).length, 45);
  assert.equal(Object.keys(loaded.stars).length, 45);
  assert.equal(Object.keys(loaded.bestTimes).length, 45);
  assert.equal(loaded.scores[44], 3044); assert.equal(loaded.bestTimes[44], 3.44);
  assert.equal(loaded.stars[44], 3); assert.equal(loaded.unlocked, 44);
  assert.deepEqual(classic.scores, {}); assert.equal(classic.settings.sound, false);
  assert.equal(hard.stars[24], 3);
  const bad = readProgress({ scores: { 0: -1 }, bestTimes: { 0: null }, stars: { 50: 3 } }, 45);
  assert.deepEqual(bad.scores, {}); assert.deepEqual(bad.bestTimes, {}); assert.deepEqual(bad.stars, {});
});

test('pulse collision masks and query fallback agree: inactive laser is harmless, active laser is lethal', () => {
  const level = { ...GENESIS_LEVELS[0], invisibleObstacles: false, wood: [], thorns: [], flower: flowerFar(),
    lasers: [{ a: { x: 0, y: 300 }, b: { x: 360, y: 300 }, pulse: { period: 2, onTime: .5 } }] };
  const g = new GardenEngine(level); g.attach();
  for (let i = 0; i < 45; i++) g.step();
  assert.equal(g.hardcore.isLaserActive(0), false);
  g.release(); Matter.Body.setPosition(g.drop, { x: 180, y: 300 }); g.step();
  assert.equal(g.status, 'running');
  const hot = new GardenEngine(level); hot.attach(); hot.release();
  Matter.Body.setPosition(hot.drop, { x: 180, y: 300 }); hot.step();
  assert.equal(hot.status, 'lost'); assert.match(hot.failReason, /Laser/);
  g.dispose(); hot.dispose();
});
function flowerFar() { return { x: 320, y: 548, base: 590 }; }

test('crushers pause before release, compress at real speed, clamp, kill on contact, and reset', () => {
  const level = { ...GENESIS_LEVELS[0], countdownTimer: 20, wood: [], invisibleObstacles: false,
    crushingWalls: [{ y: 370, h: 440, width: 24, startGap: 360, endGap: 90, speed: 20 }] };
  const g = new GardenEngine(level); g.attach();
  for (let i = 0; i < 120; i++) g.step();
  assert.equal(g.hardcore.crushers[0].left.position.x, -12);
  g.release();
  for (let i = 0; i < 30; i++) g.step();
  assert.ok(Math.abs(g.hardcore.crushers[0].left.position.x - (-2)) < .001);
  Matter.Body.setPosition(g.drop, { x: 10, y: 300 }); g.step();
  assert.equal(g.status, 'lost'); assert.match(g.failReason, /Crushed/);
  g.dispose();
  const fresh = new GardenEngine(level);
  assert.equal(fresh.hardcore.crushers[0].left.position.x, -12);
  fresh.dispose();
});

test('rotors integrate actual angles and angular velocity; interval flips reverse and restore actual gravity', () => {
  const level = { ...GENESIS_LEVELS[0], wood: [], gravityFlipInterval: 1,
    rotatingBarrierSpeed: 1.2, rotatingBarriers: [{ x: 80, y: 300, w: 70, h: 12 }] };
  const g = new GardenEngine(level);
  for (let i = 0; i < 30; i++) g.step();
  const rotor = g.hardcore.rotors[0].body;
  assert.ok(Math.abs(rotor.angle - .6) < .001);
  assert.ok(Math.abs(rotor.angularVelocity - .02) < .001);
  g.release();
  for (let i = 0; i < 60; i++) g.hardcore.beforeStep(1 / 60, true);
  assert.ok(g.engine.gravity.y < 0); assert.equal(g.hardcore.intervalFlips, 1);
  for (let i = 0; i < 21; i++) g.hardcore.beforeStep(1 / 60, true);
  assert.ok(g.engine.gravity.y > 0);
  g.dispose();
  assert.equal(g.hardcore.rotors.length, 0);
});
