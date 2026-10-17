// GitHub Actions-only preview preparation. No Expo account or secret key needed.
// Never use this debug-signed, test-ad APK for a store release.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appDir = path.resolve(__dirname, '..');
const PREVIEW_PACKAGE = 'com.gamevilla.sliceandbloom.preview';

function previewConfig(source) {
  const result = structuredClone(source);
  assert.ok(result.expo?.android, 'Missing Expo Android configuration.');
  assert.ok(
    ['com.gamevilla.sliceandbloom', PREVIEW_PACKAGE].includes(result.expo.android.package),
    'Unexpected application ID; review preview isolation before building.',
  );
  result.expo.name = 'Slice & Bloom Preview';
  result.expo.android.package = PREVIEW_PACKAGE;
  result.expo.scheme = 'slice-bloom-preview';
  return result;
}

function requirePreviewEnvironment(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'This command only changes a disposable GitHub Actions checkout.');
  assert.equal(env.EXPO_PUBLIC_ADMOB_TEST_ADS, 'true', 'Preview APKs must use official test ad units.');
}

function verifySigning(gradle) {
  // Expo's generated template contains a public test keystore and signs release
  // builds with it by default. Fail rather than use unknown private credentials.
  assert.match(gradle, /debug\s*\{[\s\S]*?storeFile\s+file\(['"]debug\.keystore['"]\)/,
    'Expected the Expo template public debug keystore.');
  assert.match(gradle, /release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.debug/,
    'Preview release must explicitly use debug signing.');
  assert.doesNotMatch(gradle, /signingConfig\s+signingConfigs\.release/,
    'Do not use production signing credentials for this preview.');
}

function sdkPackages(versions) {
  const read = key => {
    const value = versions.match(new RegExp(`^${key}\\s*=\\s*"([\\d.]+)"`, 'm'))?.[1];
    assert.ok(value, `Cannot determine ${key} from the installed React Native SDK.`);
    return value;
  };
  return [
    'platform-tools',
    `platforms;android-${read('compileSdk')}`,
    `build-tools;${read('buildTools')}`,
    `ndk;${read('ndkVersion')}`,
    'cmake;3.22.1',
  ];
}

function main(command) {
  requirePreviewEnvironment(process.env);
  const configPath = path.join(appDir, 'app.json');
  if (command === 'prepare') {
    const config = previewConfig(JSON.parse(fs.readFileSync(configPath, 'utf8')));
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    console.log(`CI preview only: ${PREVIEW_PACKAGE}; test ads required.`);
  } else if (command === 'signing') {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.equal(config.expo.android.package, PREVIEW_PACKAGE);
    verifySigning(fs.readFileSync(path.join(appDir, 'android/app/build.gradle'), 'utf8'));
    assert.ok(fs.existsSync(path.join(appDir, 'android/app/debug.keystore')));
    console.log('Generated preview configuration uses the public Android debug signing key.');
  } else if (command === 'sdk') {
    const rnDir = path.dirname(require.resolve('react-native/package.json', { paths: [appDir] }));
    console.log(sdkPackages(fs.readFileSync(path.join(rnDir, 'gradle/libs.versions.toml'), 'utf8')).join('\n'));
  } else {
    throw new Error('Usage: prepare-preview-apk.cjs prepare|signing|sdk');
  }
}

module.exports = { previewConfig, requirePreviewEnvironment, verifySigning, sdkPackages, PREVIEW_PACKAGE };
if (require.main === module) {
  try { main(process.argv[2]); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
