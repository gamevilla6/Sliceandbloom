const test = require('node:test');
const assert = require('node:assert/strict');
const { fitLogicalViewport, screenPointToWorld } = require('../.physics-test-build/viewport.js');
const { cinematicTransform, composeViewports, cinematicFocus } = require('../.physics-test-build/viewport.js');

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

test('cinematic camera is identity at 1x regardless of focus or layout', () => {
  for (const [w,h] of [[320, 420], [402, 620], [820, 350], [768, 920]]) {
    const base = fitLogicalViewport(w,h,360,640);
    assert.deepEqual(cinematicTransform(w,h,base,1,{x:15,y:590}), {scale:1, offsetX:0, offsetY:0});
  }
});

test('draw and slice coordinates round-trip throughout zoom, letterboxing, pan and shake', () => {
  for (const [w,h] of [[320,420],[402,620],[844,220],[768,920]]) {
    const base = fitLogicalViewport(w,h,360,640);
    for (const z of [1,1.02,1.25,1.4,1.5]) {
      for (const focus of [{x:40,y:90},{x:180,y:320},{x:320,y:560}]) {
        const camera = cinematicTransform(w,h,base,z,focus);
        const matrix = composeViewports({...base, offsetX:base.offsetX+3, offsetY:base.offsetY-2},camera);
        for (const p of [{x:66,y:196},{x:240,y:392},{x:285,y:548}]) {
          const restored = screenPointToWorld(p.x*matrix.scale+matrix.offsetX,p.y*matrix.scale+matrix.offsetY,matrix,360,640);
          assert.ok(Math.abs(restored.x-p.x)<1e-8);
          assert.ok(Math.abs(restored.y-p.y)<1e-8);
        }
        assert.ok(camera.offsetX<=0 && camera.offsetY<=0);
        assert.ok(camera.offsetX+w*z>=w-1e-8 && camera.offsetY+h*z>=h-1e-8);
      }
    }
  }
});

test('focus looks ahead to the plant while keeping a single active droplet inside the zoomed frame', () => {
  for (const [w,h] of [[320,420],[402,620],[844,220],[768,920]]) {
    const base=fitLogicalViewport(w,h,360,640);
    for(const drop of [{x:35,y:80},{x:90,y:110},{x:315,y:550}]) {
      const focus=cinematicFocus([drop],{x:285,y:548},w,h,base);
      const matrix=composeViewports(base,cinematicTransform(w,h,base,1.5,focus));
      const x=matrix.offsetX+drop.x*matrix.scale,y=matrix.offsetY+drop.y*matrix.scale;
      assert.ok(x>=0 && x<=w && y>=0 && y<=h);
    }
  }
});
