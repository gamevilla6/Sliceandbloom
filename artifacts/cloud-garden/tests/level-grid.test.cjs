const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canSelectLevel, levelGrid, levelScrollOffset, levelTileHeight } = require('../.physics-test-build/levelGrid.js');
const { createGameDataStore } = require('../.physics-test-build/gameData.js');
const { completeProgress, DEFAULT_PROGRESS, readProgress } = require('../.physics-test-build/progress.js');

test('responsive grid fits narrow, wide and large-text layouts', () => {
  for (const width of [180, 281, 330, 550, 792]) {
    for (const fontScale of [1, 1.5, 2, 3]) {
      const { columns, tileWidth, gap } = levelGrid(width, fontScale);
      assert.ok(columns >= 1 && columns <= 6);
      assert.ok(columns * tileWidth + (columns - 1) * gap <= width);
    }
  }
  assert.equal(levelGrid(330, 1).columns, 3);
  assert.equal(levelGrid(330, 2).columns, 1);
  assert.equal(levelGrid(792, 1).columns, 6);
});

test('current row is visible for every bed, rotation and text scale', () => {
  for (const count of [45, 100]) {
    for (const [width, viewportHeight, fontScale] of [[330, 500, 1], [792, 160, 1], [330, 500, 2], [281, 350, 3]]) {
      const { columns, gap } = levelGrid(width, fontScale);
      const tileHeight = Math.max(124, Math.ceil(84 * fontScale + 30));
      const gridTop = 144;
      const contentHeight = gridTop + Math.ceil(count / columns) * (tileHeight + gap) - gap + 8;
      for (let index = 0; index < count; index++) {
        const y = levelScrollOffset({ index, columns, gap, tileHeight, gridTop, viewportHeight, contentHeight });
        const top = gridTop + Math.floor(index / columns) * (tileHeight + gap);
        assert.ok(y >= 0 && y <= Math.max(0, contentHeight - viewportHeight));
        assert.ok(top >= y && top < y + viewportHeight, `bed ${index + 1} starts in view`);
        if (tileHeight + 8 <= viewportHeight) assert.ok(top + tileHeight <= y + viewportHeight);
      }
    }
  }
});

test('chapter-relative offsets, first row and short content are bounded', () => {
  const metrics = { columns: 3, gap: 10, tileHeight: 124, gridTop: 144, viewportHeight: 500, contentHeight: 1000 };
  assert.equal(levelScrollOffset({ ...metrics, index: 0 }), 0);
  assert.equal(levelScrollOffset({ ...metrics, index: 2 }), 0);
  assert.equal(levelScrollOffset({ ...metrics, index: 3 }), 0);
  assert.equal(levelScrollOffset({ ...metrics, index: 9 }), 178);
  assert.equal(levelScrollOffset({ ...metrics, index: -1 }), 0);
  assert.equal(levelScrollOffset({ ...metrics, index: 0, contentHeight: 300 }), 0);
});

test('hardcore and Void tile records fit at large text scales', () => {
  for (const scale of [1, 1.5, 2, 3]) {
    for (const hardcore of [false, true]) {
      for (const voidProtocol of [false, true]) {
        const height = levelTileHeight(scale, hardcore, voidProtocol);
        const text = (36 + 30 + 18 + (hardcore ? 28 : 0) + (voidProtocol ? 28 : 0)) * scale;
        assert.ok(height >= text + 30);
      }
    }
  }
  assert.ok(levelTileHeight(3, true, true) > levelTileHeight(3));
});

test('picker and gameplay share bounded, zero-based selection rules', () => {
  assert.equal(canSelectLevel(0, 100, 0), true);
  assert.equal(canSelectLevel(1, 100, 0), false);
  assert.equal(canSelectLevel(1, 100, 1), true);
  assert.equal(canSelectLevel(99, 100, 0, 1), true);
  for (const invalid of [-1, 100, 999, NaN, 0.5]) {
    assert.equal(canSelectLevel(invalid, 100, 99, 1), false);
  }
});

test('completing Level 1 immediately enables Level 2 and survives storage reload in each mode', async () => {
  const items = new Map();
  const storage = {
    getItem: async key => items.get(key) ?? null,
    setItem: async (key, value) => { items.set(key, value); },
  };
  for (const [key, total] of [
    ['cloud-garden:v1', 100], ['cloud-garden:hardcore:v1', 100],
    ['cloud-garden:genesis:v1', 100], ['cloud-garden:void:v1', 110],
    ['cloud-garden:singularity:v1', 55],
  ]) {
    const store = createGameDataStore(storage, key, DEFAULT_PROGRESS, raw => readProgress(raw, total));
    await store.load();
    assert.equal(canSelectLevel(1, total, store.getSnapshot().data.unlocked), false);
    store.update(p => completeProgress(p, total, 0, 3, { score: 5000, time: 2 }));
    assert.equal(canSelectLevel(1, total, store.getSnapshot().data.unlocked), true);
    await store.flush();
    const cold = createGameDataStore(storage, key, DEFAULT_PROGRESS, raw => readProgress(raw, total));
    await cold.load();
    assert.equal(canSelectLevel(1, total, cold.getSnapshot().data.unlocked), true);
    assert.equal(canSelectLevel(2, total, cold.getSnapshot().data.unlocked), false);
    assert.equal(cold.getSnapshot().data.stars[0], 3);
  }
});
