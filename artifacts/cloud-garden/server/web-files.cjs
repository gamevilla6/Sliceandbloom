const fs = require('node:fs');
const path = require('node:path');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml',
  '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4', '.wasm': 'application/wasm',
};

function serveWebFile(root, pathname, req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method not allowed');
  }
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch {
    res.writeHead(400); return res.end('Invalid path');
  }
  // Never allow URL paths to escape the exported public directory.
  if (decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').includes('..')) {
    res.writeHead(403); return res.end('Forbidden');
  }
  const absoluteRoot = path.resolve(root);
  const file = path.resolve(absoluteRoot, `.${decoded.startsWith('/') ? decoded : `/${decoded}`}`);
  if (!file.startsWith(`${absoluteRoot}${path.sep}`) && file !== absoluteRoot) {
    res.writeHead(403); return res.end('Forbidden');
  }
  let target = file;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    // Expo's single-page output handles browser navigation after a reload.
    // Missing assets must return 404, never HTML disguised as JavaScript.
    if (path.extname(decoded) || decoded.startsWith('/_expo/') || decoded.startsWith('/assets/')) {
      res.writeHead(404); return res.end('Not found');
    }
    target = path.join(absoluteRoot, 'index.html');
  }
  const extension = path.extname(target).toLowerCase();
  const stat = fs.statSync(target);
  res.writeHead(200, {
    'Content-Type': TYPES[extension] || 'application/octet-stream',
    'Content-Length': stat.size,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': extension === '.html' ? 'no-cache' :
      decoded.startsWith('/_expo/static/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(target).pipe(res);
}

module.exports = { serveWebFile };
