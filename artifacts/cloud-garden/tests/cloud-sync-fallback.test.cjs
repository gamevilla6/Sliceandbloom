const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveCloudApiBaseUrl } = require('../.physics-test-build/cloudSyncConfig.js');

test('cloud sync prefers the configured API over the browser page host', () => {
  assert.equal(
    resolveCloudApiBaseUrl(
      undefined,
      'https://game-api.example.test/api/',
      'https://gamevilla6.github.io/Sliceandbloom',
      false,
    ),
    'https://game-api.example.test/api',
  );
});

test('explicit API configuration takes precedence over packaged settings', () => {
  assert.equal(
    resolveCloudApiBaseUrl(
      'https://staging-api.example.test/api',
      'https://game-api.example.test/api',
      undefined,
      false,
    ),
    'https://staging-api.example.test/api',
  );
});

test('the current browser host is only a fallback when no API is configured', () => {
  assert.equal(
    resolveCloudApiBaseUrl(undefined, undefined, 'https://gamevilla6.github.io', false),
    'https://gamevilla6.github.io/api',
  );
});

test('production cloud sync rejects insecure or credential-bearing URLs', () => {
  assert.throws(() => resolveCloudApiBaseUrl('http://api.example.test', undefined, undefined, false));
  assert.throws(() => resolveCloudApiBaseUrl('https://user:pass@api.example.test', undefined, undefined, false));
});
