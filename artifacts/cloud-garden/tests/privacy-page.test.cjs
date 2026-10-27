const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appDir = path.resolve(__dirname, '..');
const appConfig = JSON.parse(fs.readFileSync(path.join(appDir, 'app.json'), 'utf8')).expo;
const privacy = fs.readFileSync(path.join(appDir, 'app/privacy.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(appDir, 'app/_layout.tsx'), 'utf8');
const game = fs.readFileSync(path.join(appDir, 'app/index.tsx'), 'utf8');
const settings = fs.readFileSync(path.join(appDir, 'components/GameUi.tsx'), 'utf8');

test('privacy page is routed from Settings and uses the configured support contact', () => {
  assert.equal(appConfig.extra.supportEmail, 'contact.gamevilla@gmail.com');
  assert.ok(layout.includes('Stack.Screen name="privacy"'));
  assert.ok(game.includes("router.push('/privacy')"));
  assert.ok(settings.includes('testID="privacy-policy-link"'));
  assert.ok(privacy.includes('const { developerName, supportEmail } = appConfig.expo.extra;'));
});

test('privacy disclosures describe local saves, optional cloud sync, ad consent and Google data handling', () => {
  for (const disclosure of [
    'Progress, settings and reward inventory are saved on your device',
    'may sync level unlocks, stars, high scores and best times',
    'Sync is optional and best-effort',
    '404 does not erase local progress or block gameplay',
    'not a public leaderboard',
    'installation ID shown on this page',
    'Google Mobile Ads and Google’s consent tools',
    'non-personalized',
    'policies.google.com/privacy',
    'does not include a separate gameplay analytics service',
    'Clearing app or browser storage',
  ]) {
    assert.ok(privacy.includes(disclosure), `Missing privacy disclosure: ${disclosure}`);
  }
});
