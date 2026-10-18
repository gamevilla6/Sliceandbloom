/* Optional local asset regeneration; ImageMagick is NOT required on EAS. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const dir = path.resolve(__dirname, '../assets/images');
function magick(args) {
  const result = spawnSync('magick', args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw result.error ?? new Error('ImageMagick asset generation failed.');
}
// Game Mood uses a full-bleed navy app icon. Key only the connected navy
// background from its edge, then fit the foreground within Android's central
// adaptive-icon safe zone so launchers can apply their own icon mask.
magick([
  path.join(dir, 'icon.png'), '-bordercolor', '#010613', '-border', '1',
  '-alpha', 'on', '-fuzz', '13%', '-fill', 'none',
  '-draw', 'color 0,0 floodfill', '-shave', '1x1',
  '-trim', '+repage', '-resize', '600x600>',
  '-gravity', 'center', '-background', 'none', '-extent', '1024x1024',
  `PNG32:${path.join(dir, 'adaptive-icon.png')}`,
]);
// Android's themed icons use alpha as a silhouette mask.
magick([
  path.join(dir, 'adaptive-icon.png'), '-alpha', 'extract',
  '-background', 'white', '-alpha', 'shape',
  `PNG32:${path.join(dir, 'monochrome-icon.png')}`,
]);
