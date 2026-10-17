/* Export the existing game for browsers; do not rebuild or re-sign Android.
 * Expo resolves the web ad adapter, which never simulates rewarded payouts. */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const appDir = path.resolve(__dirname, '..');
const description = 'Play Slice & Bloom, a drawing and slicing physics puzzle with 465 stages across five game modes. Guide the water droplet to bloom the flower.';

function decorateHtml(html) {
  const title = 'Slice &amp; Bloom — Play the Physics Puzzle';
  const withoutMetadata = html
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name=["'](?:description|theme-color)["']|property=["']og:[^"']+["'])[^>]*>/gi, '');
  return withoutMetadata.replace('</head>', [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    '<meta name="theme-color" content="#FFF5D6" />',
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    '<meta property="og:type" content="website" />',
    '</head>',
  ].join('\n'));
}

function main() {
  const result = spawnSync('pnpm', [
    'exec', 'expo', 'export', '--platform', 'web',
    '--output-dir', 'web-build', '--max-workers', '2',
  ], { cwd: appDir, stdio: 'inherit', env: { ...process.env, CI: '1' } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Expo web export failed (${result.status ?? result.signal}).`);
  const indexPath = path.join(appDir, 'web-build', 'index.html');
  if (!fs.existsSync(indexPath)) throw new Error('Expo did not produce the browser entry page.');
  fs.writeFileSync(indexPath, decorateHtml(fs.readFileSync(indexPath, 'utf8')));
  console.log('Browser game ready in web-build/. Android signing and build profiles are unchanged.');
}

module.exports = { decorateHtml };
if (require.main === module) {
  try { main(); } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
