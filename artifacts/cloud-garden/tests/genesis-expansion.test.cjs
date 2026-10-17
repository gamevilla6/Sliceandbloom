const assert = require('node:assert/strict');
const { test } = require('node:test');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const Matter = require('matter-js');
const { GardenEngine } = require('../.physics-test-build/engine.js');
const { GENESIS_LEVELS, genesisLevelsData } = require('../.physics-test-build/genesisLevels.js');
const { reflectDirection, traceReflection } = require('../.physics-test-build/genesis.js');
const { readProgress, completeProgress } = require('../.physics-test-build/progress.js');
const { LEVELS } = require('../.physics-test-build/levels.js');
const { levelTools } = require('../.physics-test-build/levelTools.js');
const { HARDCORE_LEVELS } = require('../.physics-test-build/hardcoreLevels.js');
const { VOID_LEVELS } = require('../.physics-test-build/voidLevels.js');
const { SINGULARITY_LEVELS } = require('../.physics-test-build/singularityLevels.js');
const { Composite, Body, Bodies, Events, Vector } = Matter;

function prepare(g, pause = 30, initialWait = 0) {
  for (let i = 0; i < initialWait; i++) g.step();
  for (const h of g.level.hint) {
    assert.ok(g.beginInput(), 'player can start each supplied gesture');
    if (h.kind === 'draw') assert.ok(g.addStroke(h.pts), 'draw fits the strict ink cap');
    else {
      let hits = 0;
      for (let i = 1; i < h.pts.length; i++) hits += g.slice(h.pts[i - 1], h.pts[i]);
      g.endSlice();
      assert.ok(hits > 0, 'slice hits a real mirror, rope or wooden seal');
    }
    for (let i = 0; i < pause; i++) g.step();
  }
  for (let i = 0; i < 600 && !g.genesis.objectivesComplete && g.status === 'ready'; i++) g.step();
}

function play(level, pause = 30, initialWait = 0) {
  const g = new GardenEngine(level); g.attach();
  const targetContacts = new Set();
  Events.on(g.engine, 'collisionStart', ({ pairs }) => {
    for (const { bodyA, bodyB } of pairs) {
      if (bodyA.label === 'drop' && bodyB.label === 'plant') targetContacts.add(bodyB.id);
      if (bodyB.label === 'drop' && bodyA.label === 'plant') targetContacts.add(bodyA.id);
    }
  });
  prepare(g, pause, initialWait);
  assert.ok(g.release());
  for (let i = 0; i < 1200 && g.status === 'running'; i++) g.step();
  return { g, targetContacts };
}

test('Genesis expands to 100 independent layouts and preserves the original 45 byte-for-byte', () => {
  assert.equal(GENESIS_LEVELS.length, 100);
  assert.equal(genesisLevelsData, GENESIS_LEVELS);
  assert.equal(new Set(GENESIS_LEVELS.map(l => l.name)).size, 100);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(GENESIS_LEVELS.slice(0, 45))).digest('hex'),
    '6ae2213e972ab0addcf0cb23a6af2847107f0838e214c7c6908cf0740c1687a5');
  const geometry = l => JSON.stringify([l.drop, l.flower, l.wood, l.soil, l.hint,
    l.reflectionPuzzle, l.pulleyPuzzle, l.splitPuzzle]);
  assert.equal(new Set(GENESIS_LEVELS.slice(45).map(geometry)).size, 55);
  for (const [index, l] of GENESIS_LEVELS.entries()) assert.equal(l.id, index + 1);
  const old = new Set([...LEVELS, ...HARDCORE_LEVELS, ...VOID_LEVELS, ...SINGULARITY_LEVELS].map(geometry));
  for (const l of GENESIS_LEVELS.slice(45)) {
    assert.ok(!old.has(geometry(l)), 'new puzzles are not renamed modes');
    for (const flag of ['laserReflection', 'multiStagePulley', 'splitDropletRequired']) assert.equal(typeof l[flag], 'boolean');
    assert.equal(l.hardcoreCountdown, l.countdownTimer);
    assert.equal(l.hardcoreCountdown, l.hardcore.timeLimit);
    assert.equal(l.par, l.hint.length);
    assert.ok(l.hardcore.goldTime < l.hardcoreCountdown);
    assert.ok(l.laserReflection || l.multiStagePulley || l.splitDropletRequired);
  }
  for (let i = 45; i < 89; i++) {
    assert.ok(GENESIS_LEVELS[i + 11].hardcoreCountdown < GENESIS_LEVELS[i].hardcoreCountdown);
    assert.ok(GENESIS_LEVELS[i + 11].maxInkLength <= GENESIS_LEVELS[i].maxInkLength);
  }
});

for (const level of GENESIS_LEVELS.slice(45)) {
  test(`Genesis ${level.id}: ${level.name} earns three stars through its real mechanisms`, () => {
    const { g, targetContacts } = play(level);
    try {
      assert.equal(g.status, 'won', `${g.failReason}, ${g.elapsed}s`);
      assert.equal(g.stars, 3);
      assert.ok(g.score > 0 && g.inkUsed <= g.inkMax && g.actions === level.par);
      assert.ok(g.genesis.objectivesComplete);
      assert.equal(targetContacts.size, level.splitDropletRequired ? 2 : 1, 'actual Matter target contacts');
      if (level.laserReflection) assert.ok(g.genesis.reflectionCount > 0 && g.genesis.receivers.every(r => r.active));
      if (level.multiStagePulley) assert.deepEqual(g.genesis.pulleyOrder, level.pulleyPuzzle.stages.map((_, i) => i));
      if (level.splitDropletRequired) assert.ok(g.genesis.bothBudsComplete);
    } finally { g.dispose(); }
  });
  test(`Genesis ${level.id}: reading time and human-paced gestures preserve a valid route`, () => {
    const { g } = play(level, 60, 120);
    try { assert.equal(g.status, 'won', g.failReason); assert.equal(g.stars, 3); }
    finally { g.dispose(); }
  });
}

test('reflection follows physical mirror angles, opaque occlusion, finite parallel rays and bounded bounces', () => {
  for (const angle of [0, Math.PI / 8, Math.PI / 4, Math.PI / 2, -Math.PI / 4]) {
    const d = Vector.normalise({ x: 1, y: .2 }), n = { x: -Math.sin(angle), y: Math.cos(angle) };
    const out = reflectDirection(d, n);
    assert.ok(Math.abs(Vector.magnitude(out) - 1) < 1e-8);
    assert.ok(Math.abs(Vector.dot(d, n) + Vector.dot(out, n)) < 1e-8);
  }
  const mirror = Bodies.rectangle(100, 100, 70, 6, { isStatic: true, angle: Math.PI / 4 });
  const trace = () => traceReflection({ x: 10, y: 100 }, { x: 1, y: 0 }, [mirror], [],
    [{ x: 96, y: 200, gate: { x: 180, y: 240, w: 90, h: 14 } }]);
  assert.equal(trace().receiver, 0);
  assert.equal(trace().reflections, 1);
  Body.setAngle(mirror, Math.PI / 2);
  assert.equal(trace().receiver, -1);
  Body.setAngle(mirror, Math.PI / 4);
  const wall = Bodies.rectangle(50, 100, 10, 80, { isStatic: true });
  const blocked = traceReflection({ x: 10, y: 100 }, { x: 1, y: 0 }, [mirror], [wall]);
  assert.equal(blocked.reflections, 0); assert.ok(blocked.segments[0].b.x <= 45.01);
  for (const direction of [{ x: 1, y: 1 }, { x: 1, y: 1e-12 }, { x: 0, y: 0 }]) {
    const r = traceReflection({ x: 10, y: 100 }, direction, [mirror], []);
    assert.ok(r.segments.length <= 7);
    assert.ok(r.segments.every(s => [s.a.x, s.a.y, s.b.x, s.b.y].every(Number.isFinite)));
  }
  const bounds = [Bodies.rectangle(0, 100, 200, 6, { isStatic: true }),
    Bodies.rectangle(0, -100, 200, 6, { isStatic: true })];
  assert.ok(traceReflection({ x: 0, y: 0 }, { x: .01, y: 1 }, bounds, []).segments.length <= 7);
});

test('the toolbar enables Slice for every mirror/pulley stage and starts new stages with the required tool', () => {
  for (const l of GENESIS_LEVELS.slice(45)) {
    const tools = levelTools(l, l.maxInkLength);
    assert.equal(tools.initialTool, l.hint[0].kind);
    assert.equal(tools.canSlice, l.hint.some(h => h.kind === 'slice'));
    assert.ok(tools.canDraw);
    if (l.laserReflection || l.multiStagePulley) assert.ok(tools.canSlice);
  }
  for (const l of [...LEVELS, ...HARDCORE_LEVELS, ...GENESIS_LEVELS.slice(0, 45)]) {
    const oldSlice = l.wood.length > 0 || !!l.ropes?.length || l.stones.length > 0 || !!l.weights?.length;
    assert.equal(levelTools(l, l.ink).canSlice, oldSlice);
    assert.equal(levelTools(l, l.ink).initialTool, l.ink > 0 ? 'draw' : 'slice');
  }
});

test('dense pointer-sized mirror strokes latch receivers using the same accumulated segments as PanResponder', () => {
  for (const l of GENESIS_LEVELS.slice(45).filter(l => l.laserReflection)) {
    const g = new GardenEngine(l); g.attach();
    for (const h of l.hint.slice(0, l.reflectionPuzzle.mirrors.length)) {
      g.beginInput();
      const [a, b] = h.pts;
      let trail = [a];
      for (let n = 1; n <= 20; n++) {
        const p = { x: a.x + (b.x - a.x) * n / 20, y: a.y + (b.y - a.y) * n / 20 };
        trail.push(p); if (trail.length > 10) trail.shift();
        if (g.slice(trail[0], p)) trail = [p];
      }
      g.endSlice();
    }
    g.step();
    assert.ok(g.genesis.receivers.every(r => r.active), `receivers latch on ${l.id}`);
    assert.equal(g.actions, l.reflectionPuzzle.mirrors.length, 'one action per real pointer gesture');
    g.dispose();
  }
});

test('a simultaneous reflected laser and target contact fails rather than awarding a win', () => {
  const g = new GardenEngine(GENESIS_LEVELS[45]); g.attach(); g.release();
  g.genesis.receivers.forEach(r => { r.active = true; });
  Body.setPosition(g.drop, g.level.flower);
  g.genesis.beams = [{ a: { x: 100, y: 548 }, b: { x: 260, y: 548 }, width: 4, active: true }];
  Events.trigger(g.engine, 'collisionStart', { pairs: [{ bodyA: g.drop, bodyB: g.plant }] });
  assert.equal(g.status, 'lost');
  assert.match(g.failReason, /laser/i);
  g.dispose();
});

test('reflection locks cannot be bypassed by touching the flower and visible active rays are lethal', () => {
  const g = new GardenEngine(GENESIS_LEVELS[45]); g.attach(); g.release();
  Body.setPosition(g.drop, g.level.flower); g.step();
  assert.notEqual(g.status, 'won'); assert.equal(g.genesis.objectivesComplete, false);
  const beam = g.genesis.beams.find(b => b.active);
  assert.ok(beam);
  Body.setPosition(g.drop, { x: (beam.a.x + beam.b.x) / 2, y: (beam.a.y + beam.b.y) / 2 });
  Body.setVelocity(g.drop, { x: 0, y: 0 });
  g.step(); assert.equal(g.status, 'lost'); assert.match(g.failReason, /laser/i);
  g.dispose();
});

test('pulley gates move through physical rope take-up and only contact-triggered stages latch in order', () => {
  const g = new GardenEngine(GENESIS_LEVELS[48]); g.attach(); // triple tension
  for (let i = 0; i < 180; i++) g.step();
  assert.ok(g.genesis.pulleys.every(p => !p.released && !p.active));
  const before = g.genesis.pulleys[0].gate.position.y;
  prepare(g, 30);
  assert.deepEqual(g.genesis.pulleyOrder, [0, 1, 2]);
  assert.ok(g.genesis.pulleys[0].gate.position.y < before - 100, 'gate was physically lifted');
  assert.ok(g.genesis.pulleys.every(p => Matter.Query.collides(p.weight, [p.button]).length));
  assert.ok(g.genesis.pulleys.every(p => !g.bodies.includes(p.gate)));
  g.dispose();
});

test('wedge splitting is once-only, finite and mass-conserving; one child cannot complete both buds', () => {
  const g = new GardenEngine(GENESIS_LEVELS[49]); g.attach(); prepare(g); g.release();
  const mass = g.drop.mass;
  while (!g.genesis.split && g.status === 'running') g.step();
  assert.equal(g.genesis.children.length, 2);
  assert.ok(!g.bodies.includes(g.drop));
  const [a, b] = g.genesis.children;
  assert.ok([a, b].every(c => !c.isStatic && [c.mass, c.inertia, c.velocity.x, c.velocity.y].every(Number.isFinite)));
  assert.ok(Math.abs(a.mass + b.mass - mass) < 1e-8);
  assert.ok(a.circleRadius < g.drop.circleRadius && b.circleRadius === a.circleRadius);
  const identities = g.genesis.children.map(c => c.id);
  Body.setPosition(a, g.genesis.buds[0].spec); Body.setVelocity(a, { x: 0, y: 0 });
  g.step();
  assert.equal(g.genesis.buds[0].complete, true);
  assert.equal(g.genesis.buds[1].complete, false);
  assert.equal(g.status, 'running');
  Body.setPosition(a, g.genesis.buds[1].spec);
  g.step(); assert.equal(g.genesis.buds[1].complete, false);
  assert.deepEqual(g.genesis.children.map(c => c.id), identities);
  Body.setPosition(b, { x: 180, y: 580 }); Body.setVelocity(b, { x: 0, y: 0 });
  g.step(); assert.equal(g.status, 'lost'); assert.match(g.failReason, /Thorns/);
  g.dispose();
});

test('split children have independent portal locks and both receive magnetic, wind and thermal handling', () => {
  const source = structuredClone(GENESIS_LEVELS[49]);
  source.thermalZone = true; source.thermalZones = [{ x: 180, y: 400, w: 360, h: 100 }];
  source.magneticField = { x: .0001, y: 0 };
  source.magneticZones = [{ x: 180, y: 400, w: 360, h: 100 }];
  source.winds = [{ x: 180, y: 400, w: 360, h: 100, force: { x: .0001, y: 0 } }];
  source.portals = [{ entry: { x: 100, y: 400 }, exit: { x: 260, y: 420 }, r: 18 }];
  const g = new GardenEngine(source); g.attach(); prepare(g); g.release();
  while (!g.genesis.split && g.status === 'running') g.step();
  const [a, b] = g.genesis.children;
  for (const c of [a, b]) { Body.setPosition(c, source.portals[0].entry); Body.setVelocity(c, { x: 0, y: 1 }); }
  g.advanced.afterStep([a, b], true);
  assert.equal(g.advanced.teleports, 2);
  for (const c of [a, b]) Body.setPosition(c, { x: 180, y: 400 });
  g.infinity.beforeStep(1 / 60, [a, b], g.bodies, true);
  g.advanced.beforeStep(1, 1 / 60, [a, b], true);
  assert.ok(a.force.x > 0 && b.force.x > 0);
  for (let i = 0; i < 120; i++) g.infinity.beforeStep(1 / 60, [a, b], g.bodies, true);
  assert.ok(g.infinity.heat.get(a.id) > 2 && g.infinity.heat.get(b.id) > 2);
  g.dispose();
});

test('all 100 records survive storage expansion and the former final completion unlocks 46', () => {
  const raw = { unlocked: 44, last: 44, stars: { 0: 2, 44: 3 }, scores: { 44: 9900 },
    bestTimes: { 44: 4.5 }, settings: { sound: false, haptics: true, guides: false } };
  const p = readProgress(raw, 100);
  assert.equal(p.unlocked, 45); assert.equal(p.last, 44);
  assert.deepEqual(p.scores, raw.scores); assert.deepEqual(p.bestTimes, raw.bestTimes);
  let next = p;
  for (let i = 45; i < 100; i++) next = completeProgress(next, 100, i, 3, { score: 9000 + i, time: 5 + i / 100 });
  next = readProgress(JSON.parse(JSON.stringify(next)), 100);
  assert.equal(next.unlocked, 99);
  assert.equal(next.stars[99], 3); assert.equal(next.scores[99], 9099); assert.equal(next.bestTimes[99], 5.99);
  assert.equal(next.stars[44], 3); assert.equal(next.scores[44], 9900); assert.equal(next.settings.sound, false);
  assert.deepEqual(raw.stars, { 0: 2, 44: 3 }, 'migration did not mutate original save');
});

test('heavy stages and repeated retries stay bounded and dispose every body, constraint and listener', () => {
  const times = [];
  for (let repeat = 0; repeat < 8; repeat++) {
    for (const id of [56, 67, 78, 89, 100]) {
      const g = new GardenEngine(GENESIS_LEVELS[id - 1]); g.attach();
      for (const h of g.level.hint) {
        g.beginInput();
        if (h.kind === 'draw') g.addStroke(h.pts);
        else { g.slice(h.pts[0], h.pts[h.pts.length - 1]); g.endSlice(); }
      }
      // Measure the live chain with every gate/constraint still present, then
      // the split descent. Do not dilute the profile with finished no-op ticks.
      for (let i = 0; i < 900 && (g.status === 'ready' || g.status === 'running'); i++) {
        if (g.status === 'ready' && g.genesis.objectivesComplete) g.release();
        const start = performance.now(); g.step(); times.push(performance.now() - start);
        assert.ok(g.bodies.length < 65); assert.ok(Composite.allConstraints(g.engine.world).length <= 9);
        assert.ok(g.genesis.children.length <= 2 && g.genesis.beams.length <= 14 && g.particles.length <= 180);
      }
      g.dispose();
      assert.equal(g.bodies.length, 0); assert.equal(Composite.allConstraints(g.engine.world).length, 0);
      assert.equal(g.genesis.children.length, 0); assert.equal(g.genesis.pulleys.length, 0);
      assert.equal(g.genesis.beams.length, 0); assert.equal(g.particles.length, 0);
      assert.equal(g.onEvent, undefined);
      assert.equal(g.engine.events?.collisionStart?.length ?? 0, 0);
    }
  }
  times.sort((a, b) => a - b);
  console.log(`Genesis physics profile: ${times.length} ticks, median ${times[Math.floor(times.length * .5)].toFixed(3)}ms, p95 ${times[Math.floor(times.length * .95)].toFixed(3)}ms (container CPU only; not native rendering FPS)`);
});
