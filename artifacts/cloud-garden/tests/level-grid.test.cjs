const { test } = require('node:test');
const assert = require('node:assert/strict');
const { levelGrid, levelScrollOffset } = require('../.physics-test-build/levelGrid.js');

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
  assert.equal(levelScrollOffset({ ...metrics, index: 0 }), 136);
  assert.equal(levelScrollOffset({ ...metrics, index: 2 }), 136);
  assert.equal(levelScrollOffset({ ...metrics, index: 3 }), 270);
  assert.equal(levelScrollOffset({ ...metrics, index: -1 }), 0);
  assert.equal(levelScrollOffset({ ...metrics, index: 0, contentHeight: 300 }), 0);
});
