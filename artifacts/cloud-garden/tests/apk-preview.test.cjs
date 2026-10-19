const test = require('node:test');
const assert = require('node:assert/strict');
const {
  previewConfig, requirePreviewEnvironment, verifySigning, sdkPackages, PREVIEW_PACKAGE,
} = require('../scripts/prepare-preview-apk.cjs');
const { verifyAndroidAdConfig } = require('../scripts/check-android-release.cjs');
const { makeReadme, verifyBundledConfig } = require('../scripts/package-android-release.cjs');

test('Game Villa production identity and isolated preview namespace stay consistent', () => {
  const app = require('../app.json').expo;
  assert.equal(app.extra.developerName, 'Game Villa');
  assert.equal(app.extra.supportEmail, 'contact.gamevilla@gmail.com');
  assert.equal(app.android.package, 'com.gamevilla.sliceandbloom');
  assert.equal(app.ios.bundleIdentifier, app.android.package);
  assert.equal(PREVIEW_PACKAGE, `${app.android.package}.preview`);
});

test('native AdMob Gradle configuration is present and matches the Expo plugin', () => {
  const source = require('../app.json');
  const plugin = source.expo.plugins.find(p => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads')[1];
  assert.doesNotThrow(() => verifyAndroidAdConfig(source, plugin.androidAppId));
  const missing = structuredClone(source);
  delete missing['react-native-google-mobile-ads'];
  assert.throws(() => verifyAndroidAdConfig(missing, plugin.androidAppId), /Missing native AdMob/);
  const wrong = structuredClone(source);
  wrong['react-native-google-mobile-ads'].android_app_id = 'wrong-app-id';
  assert.throws(() => verifyAndroidAdConfig(wrong, plugin.androidAppId), /must match/);
  const otherBackend = structuredClone(source);
  otherBackend['react-native-google-mobile-ads'].android_sdk = 'nextgen';
  assert.throws(() => verifyAndroidAdConfig(otherBackend, plugin.androidAppId), /classic/);
});

test('APK preview isolates identity without changing store configuration or records version', () => {
  const source = require('../app.json');
  const before = JSON.stringify(source);
  const preview = previewConfig(source);
  assert.equal(preview.expo.android.package, PREVIEW_PACKAGE);
  assert.equal(preview.expo.scheme, 'slice-bloom-preview');
  assert.equal(preview.expo.name, 'Slice & Bloom Preview');
  assert.equal(preview.expo.android.versionCode, source.expo.android.versionCode);
  assert.equal(preview.expo.version, source.expo.version);
  assert.deepEqual(preview.expo.plugins, source.expo.plugins);
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(previewConfig(preview), preview);
});

test('release bundle instructions identify the QA APK, store AAB and current contact', () => {
  const readme = makeReadme();
  assert.match(readme, /SliceAndBloom-debug-test\.apk/);
  assert.match(readme, /SliceAndBloom-production\.aab/);
  assert.match(readme, /com\.gamevilla\.sliceandbloom/);
  assert.match(readme, /contact\.gamevilla@gmail\.com/);
  assert.match(readme, /test ads/i);
  assert.match(readme, /do not upload the APK to Google Play/i);
});

test('release packaging rejects stale binary metadata and wrong package identities', () => {
  const production = structuredClone(require('../app.json').expo);
  assert.doesNotThrow(() => verifyBundledConfig(production, false));
  assert.doesNotThrow(() => verifyBundledConfig(previewConfig({ expo: production }).expo, true));
  const stale = structuredClone(production);
  stale.extra.supportEmail = 'outdated@example.invalid';
  assert.throws(() => verifyBundledConfig(stale, false), /outdated support email/);
  assert.throws(() => verifyBundledConfig(production, true));
  const wrongVersion = structuredClone(production);
  wrongVersion.android.versionCode++;
  assert.throws(() => verifyBundledConfig(wrongVersion, false));
});

test('APK preparation refuses local or live-ad environments and unknown packages', () => {
  assert.throws(() => requirePreviewEnvironment({}), /disposable/);
  assert.throws(() => requirePreviewEnvironment({
    GITHUB_ACTIONS: 'true', EXPO_PUBLIC_ADMOB_TEST_ADS: 'false',
  }), /test ad/);
  assert.doesNotThrow(() => requirePreviewEnvironment({
    GITHUB_ACTIONS: 'true', EXPO_PUBLIC_ADMOB_TEST_ADS: 'true',
  }));
  assert.throws(() => previewConfig({ expo: { android: { package: 'another.app' } } }), /Unexpected/);
});

test('APK signing guard requires public debug signing and rejects production signing', () => {
  const debug = "debug { storeFile file('debug.keystore') }";
  assert.doesNotThrow(() => verifySigning(`${debug}\nrelease { signingConfig signingConfigs.debug }`));
  assert.throws(() => verifySigning(`${debug}\nrelease { signingConfig signingConfigs.release }`));
  assert.throws(() => verifySigning('release { signingConfig signingConfigs.debug }'));
});

test('Android SDK packages come from installed RN versions and reject malformed versions', () => {
  assert.deepEqual(sdkPackages('compileSdk = "36"\nbuildTools = "36.0.0"\nndkVersion = "27.1.12297006"'), [
    'platform-tools', 'platforms;android-36', 'build-tools;36.0.0', 'ndk;27.1.12297006', 'cmake;3.22.1',
  ]);
  assert.throws(() => sdkPackages('compileSdk = "invalid"'), /Cannot determine/);
});
