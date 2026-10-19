/* Offline configuration guard; no login, keystore, service key or network needed.
 * Node 24 matches eas.json. The actual AAB still needs a successful EAS build. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const appDir = path.resolve(__dirname, '..');
const json = file => JSON.parse(fs.readFileSync(path.join(appDir, file), 'utf8'));

function verifyAndroidAdConfig(config, expectedAppId) {
  // SDK 17.2's Gradle script also reads this top-level app.json section.
  // Its Expo plugin sets manifest metadata but does not create that section.
  // Without it, googleMobileAdsJson is never initialized during configuration.
  const native = config['react-native-google-mobile-ads'];
  assert.ok(native, 'Missing native AdMob app.json section required by the installed Android SDK.');
  assert.equal(native.android_app_id, expectedAppId, 'Native AdMob App ID must match the Expo plugin.');
  assert.equal(native.android_sdk, 'classic', 'Preserve the tested classic Android AdMob backend.');
}

function resolveBuildProfile(eas, name, visiting = new Set()) {
  assert.ok(eas.build?.[name], `Missing EAS build profile: ${name}`);
  assert.ok(!visiting.has(name), `Circular EAS profile inheritance: ${[...visiting, name].join(' -> ')}`);
  const profile = eas.build[name];
  if (!profile.extends) return profile;
  visiting.add(name);
  const parent = resolveBuildProfile(eas, profile.extends, visiting);
  visiting.delete(name);
  return {
    ...parent,
    ...profile,
    env: { ...parent.env, ...profile.env },
    android: { ...parent.android, ...profile.android },
  };
}

async function main() {
  const config = json('app.json');
  const app = config.expo;
  const eas = json('eas.json');
  const ads = await import('../lib/adConfig.ts');
  verifyAndroidAdConfig(config, ads.ANDROID_ADMOB_APP_ID);
  assert.equal(app.android.package, 'com.gamevilla.sliceandbloom');
  assert.equal(app.ios.bundleIdentifier, 'com.gamevilla.sliceandbloom');
  assert.equal(app.extra.developerName, 'Game Villa');
  assert.equal(app.extra.supportEmail, 'contact.gamevilla@gmail.com');
  assert.match(app.version, /^\d+\.\d+\.\d+$/);
  assert.ok(Number.isSafeInteger(app.android.versionCode) && app.android.versionCode >= 1);
  assert.equal(eas.cli.appVersionSource, 'local');
  const prod = resolveBuildProfile(eas, 'production');
  assert.equal(prod.distribution, 'store');
  assert.equal(prod.developmentClient, false);
  assert.equal(prod.android.buildType, 'app-bundle');
  assert.ok(typeof prod.android.image === 'string' && prod.android.image.trim(),
    'Production GitHub builds require an explicit Android build image.');
  assert.equal(prod.credentialsSource, 'remote',
    'Production must preserve Expo-managed signing credentials.');
  assert.equal(prod.autoIncrement, false);
  assert.equal(prod.env.EXPO_PUBLIC_ADMOB_TEST_ADS, 'false');
  assert.equal(ads.adsUseTestUnits(false, prod.env.EXPO_PUBLIC_ADMOB_TEST_ADS), false);
  for (const profile of ['preview', 'testing', 'development']) {
    const resolved = resolveBuildProfile(eas, profile);
    assert.equal(resolved.android.buildType, 'apk');
    assert.equal(resolved.env.EXPO_PUBLIC_ADMOB_TEST_ADS, 'true');
  }
  assert.equal(resolveBuildProfile(eas, 'testing').developmentClient, false,
    'The testing APK must install and run without Metro.');
  // Prevent an EAS dashboard/environment override from silently changing ads.
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile && eas.build[profile]) {
    const expectedAds = resolveBuildProfile(eas, profile).env?.EXPO_PUBLIC_ADMOB_TEST_ADS;
    if (expectedAds !== undefined) assert.equal(process.env.EXPO_PUBLIC_ADMOB_TEST_ADS, expectedAds,
      'Ad test flag differs from eas.json; remove conflicting EAS environment overrides.');
  }
  const plugins = new Map(app.plugins.map(p => Array.isArray(p) ? p : [p, {}]));
  assert.equal(plugins.get('react-native-google-mobile-ads').androidAppId, ads.ANDROID_ADMOB_APP_ID);
  assert.equal(ads.ANDROID_ADMOB_APP_ID, 'ca-app-pub-3691647720194867~6693245246');
  assert.deepEqual(ads.ANDROID_AD_UNITS, {
    banner: 'ca-app-pub-3691647720194867/1485150592',
    interstitial: 'ca-app-pub-3691647720194867/5016456636',
    rewarded: 'ca-app-pub-3691647720194867/7981531326',
  });
  assert.equal(plugins.get('expo-audio').recordAudioAndroid, false);
  assert.equal(plugins.get('expo-audio').enableBackgroundPlayback, false);
  for (const permission of ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE', 'com.google.android.gms.permission.AD_ID'])
    assert.ok(app.android.permissions.includes(permission), `Missing ${permission}`);
  for (const permission of ['SYSTEM_ALERT_WINDOW', 'RECORD_AUDIO', 'CAMERA', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE'])
    assert.ok(app.android.blockedPermissions.includes(`android.permission.${permission}`), `Unnecessary permission not blocked: ${permission}`);
  const splash = plugins.get('expo-splash-screen');
  assert.ok(splash && splash.imageWidth > 0 && splash.resizeMode === 'contain');
  for (const file of new Set([app.icon, app.web.favicon, app.android.adaptiveIcon.foregroundImage, app.android.adaptiveIcon.monochromeImage, splash.image])) {
    const png = fs.readFileSync(path.join(appDir, file));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file} is not PNG`);
    assert.equal(png.readUInt32BE(16), 1024, `${file} must be 1024px wide`);
    assert.equal(png.readUInt32BE(20), 1024, `${file} must be 1024px high`);
    if (file === app.icon) {
      assert.ok(png.length < 1_000_000, 'The launcher icon must remain below 1 MB.');
    }
    if (file !== app.icon) assert.equal(png[25], 6, `${file} must have an RGBA mask`);
  }
  const projectId = app.extra?.eas?.projectId;
  if (projectId) assert.match(projectId, /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  else if (process.env.EAS_BUILD === 'true') throw new Error('Link your own Expo project before an EAS-hosted build.');
  else console.warn('No Expo project is linked. EAS-hosted builds require one; the native GitHub APK workflow does not.');
  console.log(`Android config OK: ${app.android.package} · ${app.version} (${app.android.versionCode})`);
  console.log('Production AAB/live ads and preview APK/test ads configured; icons and splash assets verified.');
  if (process.argv.includes('--native')) {
    const result = spawnSync('pnpm', ['exec', 'expo', 'config', '--type', 'introspect', '--json'], {
      cwd: appDir, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    });
    assert.equal(result.status, 0, result.stderr || 'Expo native config inspection failed.');
    const native = JSON.parse(result.stdout)._internal?.modResults?.android?.manifest?.manifest;
    assert.ok(native, 'Expo inspection did not return an Android manifest.');
    assert.equal(native.$.package, app.android.package);
    const permissions = new Map(native['uses-permission'].map(p => [p.$['android:name'], p.$['tools:node']]));
    for (const permission of app.android.blockedPermissions) assert.equal(permissions.get(permission), 'remove');
    for (const permission of app.android.permissions) {
      assert.ok(permissions.has(permission));
      assert.notEqual(permissions.get(permission), 'remove');
    }
    const appIds = native.application[0]['meta-data'].filter(m => m.$['android:name'] === 'com.google.android.gms.ads.APPLICATION_ID');
    assert.equal(appIds.length, 1);
    assert.equal(appIds[0].$['android:value'], ads.ANDROID_ADMOB_APP_ID);
    console.log('Expo native manifest OK: application ID, live AdMob metadata and permission-removal directives.');
    console.log('Gradle/library manifest merge and native compilation still require the actual EAS build.');
  }
}
module.exports = { verifyAndroidAdConfig };
if (require.main === module)
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
