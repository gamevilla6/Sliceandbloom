const test = require('node:test');
const assert = require('node:assert/strict');
const { fitLogicalViewport, screenPointToWorld } = require('../.physics-test-build/viewport.js');

test('logical world fits common phone and tablet viewports without stretching', () => {
  const worldWidth = 420;
  const worldHeight = 760;
  const sizes = [
    [360, 640],       // 16:9 compact phone
    [393, 852],       // 19.5:9 phone
    [430, 932],       // 20:9 flagship
    [1024, 768],      // landscape tablet
    [768, 1024],      // portrait tablet
  ];

  for (const [width, height] of sizes) {
    const fitted = fitLogicalViewport(width, height, worldWidth, worldHeight);
    assert.ok(fitted.scale > 0);
    assert.ok(fitted.offsetX >= 0);
    assert.ok(fitted.offsetY >= 0);
    assert.ok(worldWidth * fitted.scale <= width + 1e-8);
    assert.ok(worldHeight * fitted.scale <= height + 1e-8);

    const point = { x: worldWidth * 0.31, y: worldHeight * 0.72 };
    const screenX = fitted.offsetX + point.x * fitted.scale;
    const screenY = fitted.offsetY + point.y * fitted.scale;
    const restored = screenPointToWorld(screenX, screenY, fitted, worldWidth, worldHeight);
    assert.ok(Math.abs(restored.x - point.x) < 1e-8);
    assert.ok(Math.abs(restored.y - point.y) < 1e-8);
  }
});

test('viewport scaling safely handles zero-sized layouts before the first layout event', () => {
  assert.deepEqual(fitLogicalViewport(0, 0, 420, 760), {
    scale: 0,
    offsetX: 0,
    offsetY: 0,
  });
});

test('resizing the gameplay canvas preserves every world edge and stroke coordinates', () => {
  // Canvas sizes after the compact HUD and native safe areas are laid out.
  // Resizing changes presentation only, never level geometry or ink lengths.
  const points = [{ x: 0, y: 0 }, { x: 360, y: 640 }, { x: 73, y: 219 }];
  for (const [width, height] of [[320, 416], [390, 680], [430, 768], [768, 860], [550, 360]]) {
    const viewport = fitLogicalViewport(width, height, 360, 640);
    assert.equal(viewport.scale, Math.min(width / 360, height / 640));
    for (const point of points) {
      const restored = screenPointToWorld(
        viewport.offsetX + point.x * viewport.scale,
        viewport.offsetY + point.y * viewport.scale,
        viewport, 360, 640,
      );
      assert.ok(Math.abs(restored.x - point.x) < 1e-8);
      assert.ok(Math.abs(restored.y - point.y) < 1e-8);
    }
    assert.ok(Math.abs(viewport.offsetX) < 1e-8 || Math.abs(viewport.offsetY) < 1e-8,
      'The world must use the full available width or height, not a fixed-size inner frame');
  }
});

