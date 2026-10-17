const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { serveWebFile } = require('../server/web-files.cjs');
const { decorateHtml } = require('../scripts/build-web.cjs');

let root, server, origin;
before(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'slice-bloom-web-test-'));
  fs.writeFileSync(path.join(root, 'index.html'), '<html><head></head><body>game-entry</body></html>');
  fs.mkdirSync(path.join(root, '_expo/static/js/web'), { recursive: true });
  fs.writeFileSync(path.join(root, '_expo/static/js/web/game-123.js'), 'globalThis.gameLoaded=true;');
  server = http.createServer((req, res) => serveWebFile(root, req.url, req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(root, { recursive: true, force: true });
});
test('root and deep links serve the browser game instead of the Expo landing page', async () => {
  for (const route of ['/', '/levels', '/rewards']) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.match(await response.text(), /game-entry/);
  }
});
test('hashed JavaScript has the correct MIME type, immutable caching and HEAD support', async () => {
  const route = origin + '/_expo/static/js/web/game-123.js';
  const response = await fetch(route);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/javascript/);
  assert.match(response.headers.get('cache-control'), /immutable/);
  assert.match(await response.text(), /gameLoaded/);
  const head = await fetch(route, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});
test('missing assets return 404 and do not fall back to HTML', async () => {
  for (const route of ['/_expo/missing.js', '/assets/missing', '/missing.css']) {
    assert.equal((await fetch(origin + route)).status, 404);
  }
});
test('unsafe paths, malformed escapes and write requests are rejected', async () => {
  for (const route of ['/..%2Fprivate.json', '/%00secret', '/%5Csecret']) {
    assert.equal((await fetch(origin + route)).status, 403);
  }
  assert.equal((await fetch(origin + '/bad%ZZ')).status, 400);
  assert.equal((await fetch(origin + '/', { method: 'POST' })).status, 405);
});
test('exported page has game metadata without duplicate titles or descriptions', () => {
  const html = decorateHtml('<html><head><title>Old</title><meta name="description" content="Old"></head><body></body></html>');
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.equal((html.match(/name="description"/g) || []).length, 1);
  assert.match(html, /Slice &amp; Bloom/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /465 stages/);
});
