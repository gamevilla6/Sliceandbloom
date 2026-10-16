const assert = require('node:assert/strict');
const { test } = require('node:test');
const Matter = require('matter-js');
const { GardenEngine, DROP_R } = require('../.physics-test-build/engine.js');
const { VOID_LEVELS } = require('../.physics-test-build/voidLevels.js');
const { LEVELS } = require('../.physics-test-build/levels.js');
const { GENESIS_LEVELS } = require('../.physics-test-build/genesisLevels.js');
const { HARDCORE_LEVELS } = require('../.physics-test-build/hardcoreLevels.js');
const { readProgress, completeProgress, recordDeath, DEFAULT_PROGRESS } = require('../.physics-test-build/progress.js');

function solve(level, wait, pause = 15, reading = 0) {
  const g = new GardenEngine(level);
  g.attach();
  let contacts = 0, valid = true;
  Matter.Events.on(g.engine, 'collisionStart', ({ pairs }) => {
    if (pairs.some(p => p.bodyA === g.drop && p.bodyB === g.plant
      || p.bodyB === g.drop && p.bodyA === g.plant)) contacts++;
  });
  for (let t = 0; t < reading; t++) g.step();
  for (const hint of level.hint) {
    valid &&= g.beginInput();
    if (hint.kind === 'draw') valid &&= g.addStroke(hint.pts);
    else {
      let hits = 0;
      for (let i = 1; i < hint.pts.length; i++) hits += g.slice(hint.pts[i - 1], hint.pts[i]);
      valid &&= hits > 0;
      g.endSlice();
    }
    for (let t = 0; t < pause; t++) g.step();
  }
  for (let t = 0; t < wait; t++) g.step();
  valid &&= g.release();
  for (let t = 0; t < 600 && g.status === 'running'; t++) g.step();
  const result = {
    won: valid && contacts > 0 && g.status === 'won',
    stars: g.stars, ink: g.inkUsed, actions: g.actions,
    portals: g.advanced.teleports, allKeys: g.advanced.switches.every(s => s.active),
    message: `${level.id} ${g.status}: ${g.failReason}; ${g.elapsed.toFixed(2)}s, (${g.drop.position.x.toFixed(1)},${g.drop.position.y.toFixed(1)})`,
  };
  g.dispose();
  return result;
}

test('Void owns 110 distinct layouts and leaves the other 190 stages intact', () => {
  assert.equal(VOID_LEVELS.length, 110);
  assert.equal(LEVELS.length, 100);
  assert.equal(GENESIS_LEVELS.length, 45);
  assert.equal(HARDCORE_LEVELS.length, 45);
  const geometry = l => JSON.stringify([l.drop, l.flower, l.wood, l.soil, l.hint, l.portals, l.weights, l.switches]);
  assert.equal(new Set(VOID_LEVELS.map(geometry)).size, 110);
  assert.equal(new Set(VOID_LEVELS.map(l => l.name)).size, 110);
  for (const [idx, l] of VOID_LEVELS.entries()) {
    assert.equal(l.id, idx + 1);
    assert.equal(l.voidProtocol.decaySeconds, 1.5);
    assert.ok(l.voidProtocol.gravityMultiplier >= 2);
    assert.ok(l.voidProtocol.maxVelocity <= 12);
    assert.ok(l.hyperSensitiveScale < 1);
    assert.equal(l.hint.length, l.hardcore.maxStrokes);
    for (const old of [...LEVELS, ...GENESIS_LEVELS, ...HARDCORE_LEVELS]) assert.notEqual(geometry(l), geometry(old));
  }
});

for (const level of VOID_LEVELS) {
  test(`Void ${level.id}: ${level.name} earns Gold through real physics within all budgets`, () => {
    let r;
    for (let wait = 0; wait <= 108; wait += 6) {
      r = solve(level, wait);
      if (r.won && r.stars === 3) break;
    }
    assert.ok(r.won, r.message);
    assert.equal(r.stars, 3, r.message);
    assert.ok(r.ink <= level.ink);
    assert.equal(r.actions, level.par);
    assert.ok(r.portals >= (level.portals?.length ?? 0));
    assert.ok(r.allKeys);
  });
  test(`Void ${level.id}: player-paced input after reading still has a genuine solution`, () => {
    let r;
    for (let wait = 0; wait <= 108; wait += 6) {
      r = solve(level, wait, 30, 90);
      if (r.won) break;
    }
    assert.ok(r.won, r.message);
  });
}

test('shadow changes only presentation: periodic illumination, temporary touch reveal and proximity', () => {
  const g = new GardenEngine(VOID_LEVELS[0]);
  const wood = g.bodies.find(b => b.label === 'cut');
  assert.equal(g.isObstacleVisible(wood), true);
  for (let t = 0; t < 30; t++) g.step();
  assert.equal(g.isObstacleVisible(wood), false);
  assert.ok(Matter.Query.point(g.bodies, wood.position).includes(wood), 'invisible still physically solid');
  g.revealAt(wood.position);
  assert.equal(g.isObstacleVisible(wood), true);
  assert.equal(g.actions, 0);
  for (let t = 0; t < 45; t++) g.step();
  assert.equal(g.isObstacleVisible(wood), false);
  for (let t = 0; t < 30; t++) g.step();
  assert.equal(g.isObstacleVisible(wood), true, 'next global flash');
  g.release();
  Matter.Body.setPosition(g.drop, wood.position);
  assert.equal(g.isObstacleVisible(wood), true, 'Cloud illuminates nearby obstacles');
  g.dispose();
});

test('drawn ink shrinks physically then is removed exactly at 1.5 seconds, without refunds', () => {
  const g = new GardenEngine(VOID_LEVELS[1]);
  assert.ok(g.addStroke(g.level.hint[0].pts));
  const ink = g.strokes[0].bodies[0], initialArea = ink.area, spent = g.inkUsed;
  for (let t = 0; t < 75; t++) g.step();
  assert.ok(ink.area < initialArea);
  assert.ok(g.voidProtocol.strokeOpacity(ink) > 0 && g.voidProtocol.strokeOpacity(ink) < 1);
  assert.ok(g.bodies.includes(ink));
  for (let t = 0; t < 14; t++) g.step();
  assert.ok(g.bodies.includes(ink));
  g.step();
  assert.ok(!g.bodies.includes(ink));
  assert.equal(g.voidProtocol.strokeOpacity(ink), 0);
  assert.equal(g.strokes.length, 0);
  assert.equal(g.inkUsed, spent);
  assert.equal(g.actions, 1);
  assert.equal(g.undo(), false);
  g.dispose();
});

test('specific entropy floors wait for first input, then shrink and remove while ordinary soil stays', () => {
  const level = structuredClone(VOID_LEVELS[5]);
  level.soil.push({ x: 40, y: 400, w: 50, h: 12 });
  const g = new GardenEngine(level), [decay, ordinary] = g.soilBodies;
  for (let t = 0; t < 600; t++) g.step();
  assert.ok(g.bodies.includes(decay), 'reading a level does not age its entropy floor');
  assert.equal(g.elapsed, 0);
  g.beginInput();
  for (let t = 0; t < 90; t++) g.step();
  assert.ok(!g.bodies.includes(decay));
  assert.equal(g.isObstacleVisible(decay), false);
  assert.ok(g.bodies.includes(ordinary));
  g.dispose();
});

test('Void gravity surges are per-level and both physical and portal velocities obey their limit', () => {
  const g = new GardenEngine(VOID_LEVELS[44]);
  g.attach(); g.release();
  Matter.Body.setPosition(g.drop, { x: 120, y: 100 });
  Matter.Body.setVelocity(g.drop, { x: 50, y: -30 });
  const gravity = new Set();
  for (let t = 0; t < 20; t++) {
    g.step();
    gravity.add(g.engine.gravity.y.toFixed(3));
    assert.ok(g.drop.speed <= g.level.voidProtocol.maxVelocity + 1e-9);
    assert.ok(Number.isFinite(g.drop.mass));
  }
  assert.ok(gravity.size > 10, 'gravity actually changes with simulation time');
  assert.ok(g.voidProtocol.lastGravity > 2);
  g.dispose();
  const classic = new GardenEngine(LEVELS[0]);
  classic.step();
  assert.equal(classic.engine.gravity.y, 1);
  classic.dispose();
});

test('fresh Void retries clear timers, decaying bodies, touch illumination and all Matter resources', () => {
  const g = new GardenEngine(VOID_LEVELS[1]);
  g.addStroke(g.level.hint[0].pts);
  for (let t = 0; t < 100; t++) g.step();
  g.dispose();
  assert.equal(Matter.Composite.allBodies(g.engine.world).length, 0);
  assert.equal(Matter.Composite.allConstraints(g.engine.world).length, 0);
  const retry = new GardenEngine(VOID_LEVELS[1]);
  assert.equal(retry.voidProtocol.clock, 0);
  assert.equal(retry.elapsed, 0);
  assert.equal(retry.status, 'ready');
  assert.equal(retry.actions, 0);
  assert.equal(retry.drop.circleRadius, DROP_R * retry.level.hyperSensitiveScale);
  assert.equal(retry.timeLeft, retry.level.countdownTimer);
  retry.dispose();
});

test('Void deaths and badges round-trip safely with independent immutable progress', () => {
  let p = readProgress(null, 55);
  p = recordDeath(p, 55, 0);
  p = recordDeath(p, 55, 0);
  p = recordDeath(p, 55, 54);
  p = completeProgress(p, 55, 0, 2, { score: 2000, time: 2 });
  assert.equal(p.badges[0], 'Cleared');
  p = completeProgress(p, 55, 0, 3, { score: 3200, time: 1.8 });
  p = completeProgress(p, 55, 0, 1, { score: 1000, time: 2.5 });
  assert.equal(p.badges[0], 'Gold');
  assert.equal(p.scores[0], 3200);
  assert.equal(p.bestTimes[0], 1.8);
  const reloaded = readProgress(JSON.parse(JSON.stringify(p)), 55);
  assert.deepEqual(reloaded, p);
  assert.equal(reloaded.deaths[0], 2);
  assert.equal(reloaded.deaths[54], 1);
  assert.equal(recordDeath(p, 55, 55), p);
  assert.deepEqual(DEFAULT_PROGRESS.deaths, {});
  assert.deepEqual(readProgress(null, 100).stars, {});
  const corrupt = readProgress({ deaths: { 0: -1, 1: .5, 2: Infinity, 3: 4, 55: 1 }, badges: { 0: 'Gold' } }, 55);
  assert.deepEqual(corrupt.deaths, { 3: 4 });
  assert.deepEqual(corrupt.badges, {});
});

test('all 110 active worlds stay bounded, with no inactive stages or timers in the Matter world', () => {
  for (const l of VOID_LEVELS) {
    const g = new GardenEngine(l);
    assert.ok(g.bodies.length <= 35, `${l.id} has ${g.bodies.length} bodies`);
    assert.ok(g.ropes.length <= 3);
    assert.equal(g.strokes.length, 0);
    g.dispose();
    assert.equal(g.bodies.length, 0);
  }
});

test('the first 55 Void layouts are preserved byte-for-byte when appending 56–110', () => {
  const digest = require('node:crypto').createHash('sha256')
    .update(JSON.stringify(VOID_LEVELS.slice(0, 55))).digest('hex');
  assert.equal(digest, 'b2ed0de0c84f612057e6569cf3e84073868ebedb0373081ee2d7fd09362ec52f');
});

test('an old final-level save unlocks 56 and retains every record in the 110-level mode', () => {
  const old = { ...DEFAULT_PROGRESS, unlocked: 54, last: 54,
    stars: { 0: 2, 54: 3 }, scores: { 54: 3210 }, bestTimes: { 54: 2.5 },
    deaths: { 54: 17 }, badges: { 0: 'Cleared', 54: 'Gold' } };
  const p = readProgress(old, VOID_LEVELS.length);
  assert.equal(p.unlocked, 55);
  assert.equal(p.last, 54);
  assert.deepEqual(p.stars, old.stars);
  assert.deepEqual(p.scores, old.scores);
  assert.deepEqual(p.bestTimes, old.bestTimes);
  assert.deepEqual(p.deaths, old.deaths);
  assert.deepEqual(p.badges, old.badges);
  const last = completeProgress(recordDeath(p, 110, 109), 110, 109, 3, { score: 4000, time: 3.1 });
  assert.equal(last.deaths[109], 1);
  assert.equal(last.badges[109], 'Gold');
  assert.equal(last.unlocked, 109);
  assert.deepEqual(readProgress(JSON.parse(JSON.stringify(last)), 110), last);
});
