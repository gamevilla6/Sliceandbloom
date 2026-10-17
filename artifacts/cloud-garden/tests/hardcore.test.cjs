const assert = require('node:assert/strict');
const { test } = require('node:test');
const Matter = require('matter-js');
const crypto = require('node:crypto');
const { GardenEngine } = require('../.physics-test-build/engine.js');
const { LEVELS } = require('../.physics-test-build/levels.js');
const classicBefore = JSON.stringify(LEVELS);
const { HARDCORE_LEVELS } = require('../.physics-test-build/hardcoreLevels.js');
const { completeProgress, readProgress, DEFAULT_PROGRESS } = require('../.physics-test-build/progress.js');

function garden(t, level) {
  const g = new GardenEngine(level);
  g.attach();
  t.after(() => g.dispose());
  return g;
}
function fixture(overrides = {}) {
  return {
    id: 1, name: 'Hardcore fixture', lesson: '', hintText: '',
    drop: { x: 180, y: 100 }, flower: { x: 315, y: 548, base: 590 },
    ink: 100, par: 1, soil: [], wood: [], stones: [], thorns: [], hint: [],
    hardcore: { timeLimit: 20, goldTime: 10, maxStrokes: 2 },
    ...overrides,
  };
}

test('100 distinct hardcore levels preserve the original 45 and never change the classic levels', () => {
  assert.equal(LEVELS.length, 100);
  assert.equal(JSON.stringify(LEVELS), classicBefore);
  assert.ok(LEVELS.every(l => !l.hardcore && !l.lasers && !l.gravityZones));
  assert.equal(HARDCORE_LEVELS.length, 100);
  assert.deepEqual(HARDCORE_LEVELS.map(l => l.id), Array.from({ length: 100 }, (_, i) => i + 1));
  assert.equal(new Set(HARDCORE_LEVELS.map(l => l.name)).size, 100);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(HARDCORE_LEVELS.slice(0, 45))).digest('hex'),
    '1a55ff43e66345cf646401dffabe6fec72f44228666531abbcd2e480bec52c5d');
  const layouts = HARDCORE_LEVELS.map(({ drop, flower, soil, wood, hint, portals, lasers, weights, switches,
    ropes, rotatingBarriers, crushingWalls, gravityZones, winds, hardcore }) =>
    JSON.stringify({ drop, flower, soil, wood, hint, portals, lasers, weights, switches,
      ropes, rotatingBarriers, crushingWalls, gravityZones, winds, hardcore }));
  assert.equal(new Set(layouts).size, 100);
  for (const l of HARDCORE_LEVELS) {
    assert.ok(l.hardcore.goldTime < l.hardcore.timeLimit && l.hardcore.timeLimit <= 20);
    assert.equal(l.par, l.hint.length);
    assert.equal(l.hardcore.maxStrokes, l.par + (l.id < 36 ? 1 : 0));
    assert.ok(l.lasers.length && l.thorns.length);
    for (const base of LEVELS) {
      assert.notEqual(l.hint, base.hint);
      assert.notEqual(l.soil, base.soil);
    }
  }
});

function solveAt(level, delay) {
  const g = new GardenEngine(level);
  g.attach();
  try {
    // A short reading pause is free, matching real Hardcore timer rules.
    for (let i = 0; i < 60; i++) g.step();
    for (const h of level.hint) {
      if (!g.beginInput()) return { won: false, failReason: g.failReason };
      if (h.kind === 'draw') {
        if (!g.addStroke(h.pts)) return { won: false, failReason: 'Hint exceeded the level ink budget.' };
      } else {
        let hits = 0;
        for (let i = 1; i < h.pts.length; i++) hits += g.slice(h.pts[i - 1], h.pts[i]);
        if (hits <= 0) return { won: false, failReason: 'Hint missed its cut target.' };
        g.endSlice();
      }
      for (let i = 0; i < 30; i++) g.step();
    }
    for (let i = 0; i < 90 + delay; i++) g.step();
    if (!g.release()) return { won: false, failReason: g.failReason };
    for (let i = 0; i < 1800 && g.status === 'running'; i++) g.step();
    return {
      won: g.status === 'won', stars: g.stars, elapsed: g.elapsed, actions: g.actions,
      ink: g.inkUsed, portals: g.advanced.teleports,
      keys: g.advanced.switches.every(s => s.active), failReason: g.failReason,
    };
  } finally {
    g.dispose();
  }
}

for (const level of HARDCORE_LEVELS.slice(45)) {
  test(`Hardcore ${level.id}: ${level.name} has a player-paced, three-star real-physics route`, () => {
    let result;
    for (let delay = 0; delay <= 96; delay += 6) {
      result = solveAt(level, delay);
      if (result.won && result.stars === 3) break;
    }
    assert.equal(result.won, true, `Level ${level.id}: ${result.failReason}, ${result.elapsed?.toFixed(2)}s`);
    assert.equal(result.stars, 3);
    assert.equal(result.actions, level.par);
    assert.ok(result.ink <= level.ink);
    assert.ok(result.portals >= (level.portals?.length ?? 0));
    assert.equal(result.keys, true);
  });
}

test('unlocking Hardcore level 46 preserves all level 45 progress and the separate campaign save', () => {
  const hardcore45 = { ...completeProgress(DEFAULT_PROGRESS, 45, 44, 3, { score: 3210, time: 8.2 }), last: 44 };
  const expanded = readProgress(hardcore45, HARDCORE_LEVELS.length);
  assert.equal(expanded.unlocked, 45);
  assert.equal(expanded.last, 44);
  assert.equal(expanded.stars[44], 3);
  assert.equal(expanded.scores[44], 3210);
  assert.equal(expanded.bestTimes[44], 8.2);
  const next = completeProgress(expanded, 100, 45, 2, { score: 2075, time: 11 });
  const reload = readProgress(JSON.parse(JSON.stringify(next)), 100);
  assert.equal(reload.stars[44], 3);
  assert.equal(reload.stars[45], 2);
  assert.equal(reload.scores[44], 3210);
  assert.equal(reload.scores[45], 2075);
  assert.equal(reload.bestTimes[44], 8.2);
  assert.equal(reload.bestTimes[45], 11);
  assert.equal(readProgress(null, 100).stars[44], undefined);
});

for (const level of HARDCORE_LEVELS.slice(0, 25)) {
  test(`hardcore ${level.id}: ${level.name} has a real three-star solution at player-paced timings`, t => {
    for (const { idle, pause } of [{ idle: 0, pause: 30 }, { idle: 300, pause: 60 }, { idle: 90, pause: 90 }]) {
      const g = garden(t, level);
      let contacts = 0;
      Matter.Events.on(g.engine, 'collisionStart', ({ pairs }) => {
        if (pairs.some(p => (p.bodyA === g.drop && p.bodyB === g.plant)
          || (p.bodyB === g.drop && p.bodyA === g.plant))) contacts++;
      });
      for (let i = 0; i < idle; i++) g.step();
      assert.equal(g.elapsed, 0, 'time to read the untouched level is free');
      for (const [index, h] of level.hint.entries()) {
        assert.equal(g.beginInput(), true, `action ${index + 1} permitted`);
        if (h.kind === 'draw') assert.equal(g.addStroke(h.pts), true, `action ${index + 1} fits strict ink`);
        else {
          let hits = 0;
          for (let i = 1; i < h.pts.length; i++) hits += g.slice(h.pts[i - 1], h.pts[i]);
          assert.ok(hits > 0, `action ${index + 1} hits its obstacle after ${pause} paused ticks`);
          g.endSlice();
        }
        for (let i = 0; i < pause; i++) g.step();
      }
      if (level.hint.some(h => h.kind === 'slice')) for (let i = 0; i < 120; i++) g.step();
      assert.equal(g.release(), true);
      for (let i = 0; i < 1800 && g.status === 'running'; i++) {
        g.step();
        assert.ok(Number.isFinite(g.drop.position.x) && Number.isFinite(g.drop.position.y));
      }
      const context = `idle ${idle}, pause ${pause}, ${g.elapsed.toFixed(2)}s: ${g.failReason}`;
      assert.equal(g.status, 'won', context);
      assert.ok(contacts > 0, 'solution actually touches the plant, not a status shortcut');
      assert.equal(g.stars, 3, context);
      assert.equal(g.actions, level.par);
      assert.ok(g.inkUsed <= level.ink);
      assert.ok(g.advanced.teleports >= (level.portals?.length ?? 0));
      assert.ok(g.advanced.switches.every(s => s.active));
      if (level.gravityZones?.length) assert.ok(g.gravityActivations > 0, 'the route actually triggers gravity');
    }
  });
}

test('ink is an exact lifetime budget; undo cannot refund ink or moves', t => {
  const g = garden(t, fixture());
  assert.equal(g.addStroke([{ x: 20, y: 200 }, { x: 120.1, y: 200 }]), false);
  assert.equal(g.inkUsed, 0);
  assert.equal(g.addStroke([{ x: 20, y: 200 }, { x: 80, y: 200 }]), true);
  assert.equal(g.undo(), true);
  assert.equal(g.actions, 1);
  assert.equal(g.inkLeft, 40);
  assert.equal(g.strokes.length, 0);
  assert.equal(g.addStroke([{ x: 20, y: 250 }, { x: 60, y: 250 }]), true);
  assert.equal(g.inkLeft, 0);
  assert.equal(g.addStroke([{ x: 20, y: 300 }, { x: 36, y: 300 }]), false);
  assert.equal(g.actions, 2);
  assert.equal(g.beginInput(), false);
  assert.equal(g.release(), true, 'reaching the move cap does not disable Drop');
});

test('slice counts once per gesture, including misses, and the move cap cannot be bypassed', t => {
  const g = garden(t, fixture());
  g.slice({ x: 10, y: 350 }, { x: 30, y: 350 });
  g.slice({ x: 30, y: 350 }, { x: 50, y: 350 });
  g.endSlice();
  g.endSlice();
  assert.equal(g.actions, 1);
  g.slice({ x: 10, y: 400 }, { x: 30, y: 400 });
  g.endSlice();
  assert.equal(g.actions, 2);
  assert.equal(g.beginInput(), false);
  assert.equal(g.slice({ x: 10, y: 450 }, { x: 30, y: 450 }), 0);
  g.endSlice();
  assert.equal(g.actions, 2);
});

test('timer starts on first input, includes ready-state planning, expires once, and retry is fresh', t => {
  const l = fixture({ hardcore: { timeLimit: .1, goldTime: .05, maxStrokes: 2 } });
  const g = garden(t, l);
  for (let i = 0; i < 300; i++) g.step();
  assert.equal(g.timeLeft, .1);
  assert.equal(g.elapsed, 0);
  let losses = 0;
  g.onEvent = e => { if (e.type === 'lose') losses++; };
  g.beginInput();
  for (let i = 0; i < 20; i++) g.step();
  assert.equal(g.status, 'lost');
  assert.match(g.failReason, /Time up/);
  assert.equal(losses, 1);
  assert.ok(g.particles.some(p => p.shard));
  const elapsed = g.elapsed;
  for (let i = 0; i < 10; i++) g.step();
  assert.equal(g.elapsed, elapsed);
  assert.equal(g.release(), false);
  const retry = garden(t, l);
  assert.equal(retry.status, 'ready');
  assert.equal(retry.timeLeft, .1);
  assert.equal(retry.started, false);
  assert.equal(retry.shakeIntensity, 0);
  assert.equal(retry.particles.length, 0);
});

test('gold requires both speed and par; extra moves or slow completion reduce the rating', t => {
  const g = garden(t, fixture({ hardcore: { timeLimit: 20, goldTime: 8, maxStrokes: 3 } }));
  g.actions = 1; g.elapsed = 7.9;
  assert.equal(g.stars, 3);
  g.elapsed = 9;
  assert.equal(g.stars, 2);
  g.elapsed = 19;
  assert.equal(g.stars, 1);
  g.elapsed = 5; g.actions = 2;
  assert.equal(g.stars, 2);
  g.actions = 3;
  assert.equal(g.stars, 1);
});

for (const hazard of ['laser', 'spike']) {
  test(`${hazard} sensor immediately fails once with shards, shake and restored gravity`, t => {
    const g = garden(t, fixture(hazard === 'laser'
      ? { lasers: [{ a: { x: 120, y: 200 }, b: { x: 240, y: 200 }, width: 6 }] }
      : { thorns: [{ x: 120, y: 190, w: 120 }] }));
    let losses = 0;
    g.onEvent = e => { if (e.type === 'lose') losses++; };
    g.release();
    Matter.Body.setPosition(g.drop, { x: 180, y: 200 });
    g.step();
    assert.equal(g.status, 'lost');
    assert.match(g.failReason, hazard === 'laser' ? /Laser/ : /Thorns/);
    assert.equal(losses, 1);
    assert.ok(g.shakeIntensity > 0);
    assert.ok(g.particles.filter(p => p.shard).length >= 20);
    assert.equal(g.engine.gravity.y, 1);
    for (let i = 0; i < 10; i++) g.step();
    assert.equal(losses, 1);
  });
}

test('gravity zones invert the actual world, restore after their duration, and fire only once', t => {
  const g = garden(t, fixture({ gravityZones: [{ x: 180, y: 200, w: 100, h: 30, duration: .1 }] }));
  g.release();
  Matter.Body.setPosition(g.drop, { x: 180, y: 200 });
  g.step();
  assert.equal(g.engine.gravity.y, -1);
  assert.equal(g.engine.world.gravity.y, -1);
  assert.equal(g.gravityActivations, 1);
  for (let i = 0; i < 12; i++) g.step();
  assert.equal(g.engine.gravity.y, 1);
  assert.equal(g.gravityRemaining, 0);
  Matter.Body.setPosition(g.drop, { x: 180, y: 200 });
  g.step();
  assert.equal(g.gravityActivations, 1);
  assert.equal(g.engine.gravity.y, 1);
});

test('angled portals rotate velocity in both directions without changing speed', t => {
  const g = garden(t, fixture({ portals: [{ entry: { x: 80, y: 200 }, exit: { x: 280, y: 300 }, r: 20, rotation: Math.PI / 2 }] }));
  g.release();
  const check = (position, expected) => {
    Matter.Body.setPosition(g.drop, position);
    Matter.Body.setVelocity(g.drop, { x: 3, y: 4 });
    g.advanced.afterStep(g.drop, true);
    assert.ok(Math.abs(g.drop.velocity.x - expected.x) < 1e-8);
    assert.ok(Math.abs(g.drop.velocity.y - expected.y) < 1e-8);
    assert.ok(Math.abs(g.drop.speed - 5) < 1e-8);
  };
  check({ x: 80, y: 200 }, { x: -4, y: 3 });
  Matter.Body.setPosition(g.drop, { x: 180, y: 100 });
  g.advanced.afterStep(g.drop, true);
  g.advanced.beforeStep(1, 1, g.drop, false);
  check({ x: 280, y: 300 }, { x: 4, y: -3 });
});

test('lethal contact wins priority over a simultaneous flower contact', t => {
  const g = garden(t, fixture({ lasers: [{ a: { x: 120, y: 300 }, b: { x: 220, y: 300 } }] }));
  g.release();
  Matter.Events.trigger(g.engine, 'collisionStart', { pairs: [
    { bodyA: g.drop, bodyB: g.plant }, { bodyA: g.drop, bodyB: g.lasers[0] },
  ] });
  assert.equal(g.status, 'lost');
  assert.match(g.failReason, /Laser/);
});

test('hard impacts produce shards and shake, which decays without moving physics bodies', t => {
  const g = garden(t, fixture());
  g.release();
  Matter.Body.setVelocity(g.drop, { x: 0, y: 12 });
  const wall = g.bodies.find(b => b.label === 'wall');
  Matter.Events.trigger(g.engine, 'collisionStart', { pairs: [{ bodyA: g.drop, bodyB: wall }] });
  assert.ok(g.shakeIntensity > 0);
  assert.ok(g.particles.some(p => p.shard));
  const initial = g.shakeIntensity;
  g.step();
  assert.ok(g.shakeIntensity < initial);
});

test('rope cut emits a pop event plus glass shards; disposal clears hardcore runtime', t => {
  const g = garden(t, fixture({
    wood: [{ x: 100, y: 200, w: 20, h: 20 }, { x: 260, y: 200, w: 20, h: 20 }],
    ropes: [{ from: 0, to: 1 }],
    lasers: [{ a: { x: 20, y: 300 }, b: { x: 20, y: 500 } }],
    gravityZones: [{ x: 180, y: 100, w: 30, h: 30, duration: 1 }],
  }));
  let pops = 0;
  g.onEvent = e => { if (e.type === 'rope') pops++; };
  assert.ok(g.slice({ x: 180, y: 170 }, { x: 180, y: 230 }) > 0);
  g.endSlice();
  assert.equal(pops, 1);
  assert.equal(g.ropes.length, 0);
  assert.ok(g.particles.some(p => p.shard));
  g.release();
  g.step();
  g.dispose();
  assert.equal(g.lasers.length, 0);
  assert.equal(g.hardcore.zones.length, 0);
  assert.equal(g.engine.gravity.y, 1);
  assert.equal(g.bodies.length, 0);
});
