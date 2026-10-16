const assert = require('node:assert/strict');
const { test } = require('node:test');
const Matter = require('matter-js');
const { GardenEngine } = require('../.physics-test-build/engine.js');
const { LEVELS, levelsData } = require('../.physics-test-build/levels.js');
const { readProgress } = require('../.physics-test-build/progress.js');

function fixture(extra = {}) {
  return {
    id: 1, name: 'Infinity fixture', lesson: '', hintText: '',
    ink: 100, par: 1, drop: { x: 180, y: 100 }, flower: { x: 315, y: 548, base: 590 },
    wood: [], soil: [], thorns: [], stones: [], hint: [], ...extra,
  };
}

test('Infinity appends exactly 46–100; old campaign completion unlocks 46 without erasing records', () => {
  assert.equal(LEVELS.length, 100); assert.equal(levelsData, LEVELS);
  assert.deepEqual(LEVELS.slice(45).map(l => l.id), Array.from({ length: 55 }, (_, i) => i + 46));
  const old = readProgress({ unlocked: 44, last: 44, stars: { 0: 2, 44: 3 }, settings: { sound: false } }, 100);
  assert.equal(old.unlocked, 45); assert.equal(old.last, 44);
  assert.equal(old.stars[0], 2); assert.equal(old.stars[44], 3);
  assert.equal(old.settings.sound, false);
  const all = readProgress({ unlocked: 99, last: 99, stars: { 99: 3 } }, 100);
  assert.equal(all.unlocked, 99); assert.equal(all.last, 99);
});

test('magnetic fields apply mass-scaled directional force only within their coordinate bounds', () => {
  const g = new GardenEngine(fixture({
    magneticField: { x: .0002, y: -.0001 },
    magneticZones: [{ x: 180, y: 100, w: 80, h: 80 },
      { x: 300, y: 100, w: 60, h: 80, field: { x: -.0003, y: .0002 } }],
  }));
  g.release();
  const check = (x, expected) => {
    Matter.Body.setPosition(g.drop, { x, y: 100 });
    g.drop.force.x = 0; g.drop.force.y = 0;
    g.infinity.beforeStep(1 / 60, g.drop, g.bodies, true);
    assert.ok(Math.abs(g.drop.force.x - g.drop.mass * expected.x) < 1e-12);
    assert.ok(Math.abs(g.drop.force.y - g.drop.mass * expected.y) < 1e-12);
  };
  check(180, { x: .0002, y: -.0001 });
  check(250, { x: 0, y: 0 });
  check(300, { x: -.0003, y: .0002 });
  g.dispose();
});

test('thermal exposure is continuous per zone, resets on exit, and melts after—not before—two seconds', () => {
  const g = new GardenEngine(fixture({
    thermalZone: true, thermalZones: [{ x: 180, y: 100, w: 80, h: 80 }],
  }));
  g.release();
  for (let i = 0; i < 60; i++) assert.equal(g.infinity.beforeStep(1 / 60, g.drop, g.bodies, true), null);
  assert.ok(Math.abs(g.infinity.heat.get(g.drop.id) - 1) < 1e-9);
  Matter.Body.setPosition(g.drop, { x: 300, y: 100 });
  g.infinity.beforeStep(1 / 60, g.drop, g.bodies, true);
  assert.equal(g.infinity.heat.size, 0);
  Matter.Body.setPosition(g.drop, { x: 180, y: 100 });
  for (let i = 0; i < 120; i++) assert.equal(g.infinity.beforeStep(1 / 60, g.drop, g.bodies, true), null);
  assert.equal(g.infinity.beforeStep(1 / 60, g.drop, g.bodies, true), g.drop);
  g.dispose(); assert.equal(g.infinity.heat.size, 0);
});

test('a dynamic block overheats too; static scenery never does, and untouched reading time is free', () => {
  const g = new GardenEngine(fixture({
    drop: { x: 300, y: 100 },
    wood: [{ x: 180, y: 100, w: 30, h: 30, dynamic: true }, { x: 180, y: 120, w: 30, h: 30 }],
    thermalZone: true, thermalZones: [{ x: 180, y: 100, w: 80, h: 80 }],
  }));
  for (let i = 0; i < 300; i++) assert.equal(g.infinity.beforeStep(1 / 60, g.drop, g.bodies, false), null);
  const body = g.bodies.find(b => b.label === 'cut' && !b.isStatic);
  for (let i = 0; i < 120; i++) assert.equal(g.infinity.beforeStep(1 / 60, g.drop, g.bodies, true), null);
  assert.equal(g.infinity.beforeStep(1 / 60, g.drop, g.bodies, true), body);
  g.dispose();
});

test('thermal failure runs through the real engine, freezes Cloud, creates shards, and fresh retry clears heat', () => {
  const level = fixture({
    drop: { x: 180, y: 440 }, thermalZone: true,
    thermalZones: [{ x: 180, y: 500, w: 160, h: 200 }],
  });
  const g = new GardenEngine(level); g.attach(); g.release();
  for (let i = 0; i < 200 && g.status === 'running'; i++) g.step();
  assert.equal(g.status, 'lost'); assert.match(g.failReason, /Thermal.*Cloud melted/);
  assert.equal(g.drop.isStatic, true);
  assert.ok(g.particles.some(p => p.shard)); assert.ok(g.shakeIntensity > 0);
  g.dispose();
  const retry = new GardenEngine(level);
  assert.equal(retry.status, 'ready'); assert.equal(retry.infinity.heat.size, 0);
  retry.dispose();
});

test('multi-link counterweights cause switches to open sequentially, not by a scripted shortcut', () => {
  for (const level of LEVELS.filter(l => l.rubeGoldbergChain)) {
    const g = new GardenEngine(level); g.attach();
    assert.ok(g.ropes.length >= 3);
    assert.ok(g.ropes.some(r => r.bodyA.label === 'weight' && r.bodyB.label === 'cut'));
    assert.ok(g.ropes.some(r => r.bodyB.label === 'weight'));
    const hint = level.hint[0];
    assert.ok(g.slice(hint.pts[0], hint.pts[1]) >= 2);
    g.endSlice();
    assert.equal(g.ropes.length, 1, 'a real counterweight link remains after the two anchors are cut');
    const activated = [];
    for (let tick = 0; tick < 240; tick++) {
      g.step();
      g.advanced.switches.forEach((s, i) => { if (s.active && activated[i] === undefined) activated[i] = tick; });
    }
    assert.ok(activated[0] > 0, `bed ${level.id}: first mass reaches a sensor`);
    assert.ok(activated[1] > activated[0], `bed ${level.id}: second mass falls only after its support opens`);
    g.dispose();
  }
});

test('only the current world is instantiated and all 100 starting scenes stay within a small body/constraint budget', () => {
  for (const level of LEVELS) {
    const g = new GardenEngine(level);
    assert.ok(g.bodies.length <= 40, `bed ${level.id}: bounded broadphase work`);
    assert.ok(Matter.Composite.allConstraints(g.engine.world).length <= 6);
    for (let i = 0; i < 10; i++) g.step();
    assert.ok(Number.isFinite(g.drop.position.x) && Number.isFinite(g.drop.position.y));
    g.dispose();
    assert.equal(Matter.Composite.allBodies(g.engine.world).length, 0);
    assert.equal(Matter.Composite.allConstraints(g.engine.world).length, 0);
  }
});
