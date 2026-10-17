/* Optional local asset regeneration; ImageMagick is NOT required on EAS. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const dir = path.resolve(__dirname, '../assets/images');
function magick(args) {
  const result = spawnSync('magick', args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw result.error ?? new Error('ImageMagick asset generation failed.');
}
// Reuse the existing branded artwork, remove its cream backdrop and keep all
// artwork within the adaptive icon's central 66% safe zone (600 / 1024).
magick([
  path.join(dir, 'icon.png'), '-alpha', 'on', '-fuzz', '12%',
  '-transparent', '#F9F1DA', '-trim', '+repage', '-resize', '600x600',
  '-gravity', 'center', '-background', 'none', '-extent', '1024x1024',
  `PNG32:${path.join(dir, 'adaptive-icon.png')}`,
]);
// Android's themed icons use alpha as a silhouette mask.
magick([
  path.join(dir, 'adaptive-icon.png'), '-alpha', 'extract',
  '-background', 'white', '-alpha', 'shape',
  `PNG32:${path.join(dir, 'monochrome-icon.png')}`,
]);
