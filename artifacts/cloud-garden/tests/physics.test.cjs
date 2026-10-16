const assert = require('node:assert/strict');
const { test } = require('node:test');
const Matter = require('matter-js');
const { GardenEngine, STEP } = require('../.physics-test-build/engine.js');
const { LEVELS } = require('../.physics-test-build/levels.js');
const { createCloud, createWood } = require('../.physics-test-build/objects.js');
const { Body, Composite, Events } = Matter;

function garden(t, level = LEVELS[0]) {
  const game = new GardenEngine(level);
  game.attach();
  t.after(() => game.dispose());
  return game;
}

function fixture(overrides = {}) {
  return {
    ...LEVELS[0],
    soil: [], wood: [], stones: [], thorns: [], ropes: [], hint: [],
    ...overrides,
  };
}

function assertFiniteCloud(body, context) {
  for (const [name, value] of Object.entries({
    mass: body.mass,
    inertia: body.inertia,
    x: body.position.x,
    y: body.position.y,
    vx: body.velocity.x,
    vy: body.velocity.y,
    angle: body.angle,
    angularVelocity: body.angularVelocity,
  })) {
    assert.ok(Number.isFinite(value), `${context}: ${name} must be finite, got ${value}`);
  }
  assert.ok(body.mass > 0, `${context}: positive mass`);
  assert.ok(body.inertia > 0, `${context}: positive inertia`);
}

// Fixed physics ticks, not wall-clock delays. Allow cut timber two seconds to
// settle while Cloud is held, as the rope/shelf hints tell the player to do.
const SETTLE_STEPS = 120;
const MAX_RUN_STEPS = Math.ceil(40_000 / STEP) + 1;

test('campaign beds have stable sequential IDs, unique names and distinct puzzle layouts', () => {
  assert.deepEqual(LEVELS.map((level) => level.id), LEVELS.map((_, i) => i + 1));
  assert.equal(new Set(LEVELS.map((level) => level.name)).size, LEVELS.length);
  const layouts = LEVELS.map(({ drop, flower, soil, wood, stones, thorns, ropes }) =>
    JSON.stringify({ drop, flower, soil, wood, stones, thorns, ropes: ropes ?? [] }));
  assert.equal(new Set(layouts).size, LEVELS.length, 'new beds must not duplicate an existing puzzle');
});

for (const level of LEVELS) {
  test(`level ${level.id}: "${level.name}" hint reaches the actual plant sensor`, (t) => {
    const game = garden(t, level);
    let sensorContacts = 0;
    let wins = 0;
    Events.on(game.engine, 'collisionStart', ({ pairs }) => {
      for (const { bodyA, bodyB } of pairs) {
        if ((bodyA === game.drop && bodyB === game.plant)
          || (bodyB === game.drop && bodyA === game.plant)) sensorContacts++;
      }
    });
    game.onEvent = (event) => { if (event.type === 'win') wins++; };
    assert.equal(game.plant.isSensor, true);
    assert.ok(game.bodies.includes(game.plant));
    assert.ok(level.hint.length > 0, 'level must supply a playable hint');
    for (const [index, hint] of level.hint.entries()) {
      assert.ok(hint.pts.length >= 2, `hint ${index + 1} needs endpoints`);
      if (hint.kind === 'draw') {
        assert.equal(game.addStroke(hint.pts), true, `hint ${index + 1} must fit the ink budget`);
      } else {
        assert.equal(hint.kind, 'slice');
        let hits = 0;
        for (let i = 1; i < hint.pts.length; i++) {
          hits += game.slice(hint.pts[i - 1], hint.pts[i]);
        }
        assert.ok(hits > 0, `hint ${index + 1} must cut or push something`);
        game.actions++; // The board counts one action per completed swipe.
        game.endSlice();
      }
    }
    if (level.hint.some((hint) => hint.kind === 'slice')) {
      for (let i = 0; i < SETTLE_STEPS; i++) game.step();
    }
    assert.equal(game.release(), true);
    assertFiniteCloud(game.drop, `level ${level.id} release`);
    for (let tick = 0; tick < MAX_RUN_STEPS && game.status === 'running'; tick++) {
      game.step();
      // Winning deliberately freezes Cloud, giving it infinite static mass.
      if (game.status === 'running') assertFiniteCloud(game.drop, `level ${level.id}, tick ${tick}`);
      assert.ok(Number.isFinite(game.drop.position.x) && Number.isFinite(game.drop.position.y));
    }
    assert.equal(game.status, 'won',
      `level ${level.id} failed: ${game.failReason || 'did not finish'} at ${JSON.stringify(game.drop.position)}`);
    assert.ok(sensorContacts > 0, 'winning must involve the real Cloud/plant collision pair');
    assert.equal(wins, 1);
    assert.equal(game.stars, 3, 'the supplied hint should meet par');
  });
}

test('Cloud factory restores finite dynamic properties when released', () => {
  const cloud = createCloud({ x: 80, y: 90 });
  assert.equal(cloud.isStatic, true);
  Body.setStatic(cloud, false);
  assert.equal(cloud.isStatic, false);
  assertFiniteCloud(cloud, 'factory release');
});

test('engine release stays finite through multiple physics steps and only releases once', (t) => {
  const game = garden(t);
  assert.equal(game.drop.isStatic, true);
  assert.equal(game.release(), true);
  assert.equal(game.release(), false);
  for (let tick = 0; tick < 30; tick++) {
    game.step();
    assert.equal(game.status, 'running');
    assertFiniteCloud(game.drop, `release tick ${tick}`);
  }
  assert.ok(game.drop.position.y > game.level.drop.y, 'released Cloud must fall');
});

function ropeGarden(t) {
  return garden(t, fixture({
    wood: [
      { x: 100, y: 80, w: 28, h: 18 },
      { x: 260, y: 80, w: 28, h: 18 },
      { x: 180, y: 260, w: 170, h: 18, dynamic: true },
    ],
    ropes: [
      { from: 0, to: 2, pointB: { x: -65, y: 0 } },
      { from: 1, to: 2, pointB: { x: 65, y: 0 } },
    ],
  }));
}

test('intersected ropes disappear from both the rope list and physics world; misses do not', (t) => {
  const game = ropeGarden(t);
  const [left, right] = game.ropes;
  assert.equal(Composite.allConstraints(game.engine.world).length, 2);
  assert.equal(game.slice({ x: 20, y: 170 }, { x: 60, y: 170 }), 0);
  assert.deepEqual(game.ropes, [left, right]);
  assert.equal(game.slice({ x: 90, y: 170 }, { x: 140, y: 170 }), 1);
  assert.deepEqual(game.ropes, [right]);
  assert.deepEqual(Composite.allConstraints(game.engine.world), [right]);
  assert.equal(game.slice({ x: 220, y: 170 }, { x: 280, y: 170 }), 1);
  assert.equal(game.ropes.length, 0);
  assert.equal(Composite.allConstraints(game.engine.world).length, 0);
});

test('splitting suspended timber also removes constraints attached to the removed body', (t) => {
  const game = ropeGarden(t);
  const wood = game.ropes[0].bodyB;
  assert.ok(game.slice({ x: 180, y: 235 }, { x: 180, y: 285 }) > 0);
  assert.ok(!game.bodies.includes(wood));
  assert.equal(game.ropes.length, 0);
  assert.equal(Composite.allConstraints(game.engine.world).length, 0);
  const pieces = game.bodies.filter((body) => body.label === 'cut' && !body.isStatic);
  assert.equal(pieces.length, 2);
  for (const piece of pieces) assertFiniteCloud(piece, 'cut timber');
});

for (const released of [false, true]) {
  test(`swipe blades exist for exactly one physics update (${released ? 'running' : 'ready'})`, (t) => {
    const game = garden(t);
    if (released) game.release();
    game.slice({ x: 30, y: 30 }, { x: 100, y: 30 });
    game.slice({ x: 30, y: 50 }, { x: 100, y: 50 });
    const blades = () => game.bodies.filter((body) => body.label === 'blade');
    assert.equal(blades().length, 2);
    assert.ok(blades().every((body) => body.isSensor && body.isStatic));
    let updates = 0;
    Events.on(game.engine, 'beforeUpdate', () => {
      updates++;
      assert.equal(blades().length, updates === 1 ? 2 : 0);
    });
    const startTime = game.engine.timing.timestamp;
    game.step();
    assert.equal(updates, 1);
    assert.equal(game.engine.timing.timestamp - startTime, STEP);
    assert.equal(blades().length, 0);
    game.step();
    assert.equal(updates, 2);
    assert.equal(blades().length, 0);
  });
}

test('dynamic timber gets a directional impulse once per swipe, not on every segment', (t) => {
  const game = garden(t, fixture({
    wood: [{ x: 180, y: 300, w: 100, h: 20, dynamic: true }],
  }));
  const wood = game.bodies.find((body) => body.label === 'cut');
  assert.equal(wood.isStatic, false);
  // Entirely inside the plank: overlaps the sensor but cannot split its edges.
  const a = { x: 170, y: 300 };
  const b = { x: 190, y: 300 };
  assert.equal(game.slice(a, b), 1);
  assert.ok(game.bodies.includes(wood), 'the original plank must receive the push');
  assert.ok(Math.abs(wood.velocity.x - 2.6) < 1e-9);
  assert.equal(wood.velocity.y, 0);
  assert.equal(game.slice(a, b), 0);
  assert.ok(Math.abs(wood.velocity.x - 2.6) < 1e-9);
  game.endSlice();
  assert.equal(game.slice(b, a), 1);
  assert.ok(Math.abs(wood.velocity.x) < 1e-9, 'reverse swipe cancels the first impulse');
  assertFiniteCloud(wood, 'pushed timber');
});

test('static timber remains fixed when a swipe overlaps without splitting it', (t) => {
  const game = garden(t);
  const wood = createWood({ x: 180, y: 300, w: 100, h: 20 });
  Composite.add(game.engine.world, wood);
  assert.equal(wood.isStatic, true);
  assert.equal(game.slice({ x: 170, y: 300 }, { x: 190, y: 300 }), 0);
  assert.deepEqual(wood.velocity, { x: 0, y: 0 });
});

test('disposal clears static and dynamic bodies, constraints, collision pairs and callbacks', (t) => {
  const game = ropeGarden(t);
  let callbacks = 0;
  game.onEvent = () => callbacks++;
  assert.equal(game.addStroke([{ x: 20, y: 400 }, { x: 100, y: 450 }]), true);
  game.step();
  game.slice({ x: 30, y: 30 }, { x: 100, y: 30 });
  assert.ok(game.bodies.some((body) => body.label === 'blade'));
  assert.ok(game.bodies.some((body) => body.label === 'ink'));
  assert.ok(game.bodies.some((body) => body.isStatic));
  assert.ok(game.bodies.some((body) => !body.isStatic));
  assert.ok(Composite.allConstraints(game.engine.world).length > 0);
  game.dispose();
  const before = callbacks;
  assert.deepEqual(game.bodies, []);
  assert.deepEqual(Composite.allConstraints(game.engine.world), []);
  assert.deepEqual(game.ropes, []);
  assert.deepEqual(game.engine.pairs.list, []);
  assert.equal(game.onEvent, undefined);
  // A stale collision delivered after unmount must not finish the old game.
  game.status = 'running';
  Events.trigger(game.engine, 'collisionStart', { pairs: [{ bodyA: game.drop, bodyB: game.plant }] });
  assert.equal(game.status, 'running', 'engine collision listener must be detached');
  assert.equal(callbacks, before);
  game.dispose(); // Cleanup must be safe to repeat.
  assert.deepEqual(game.bodies, []);
});
