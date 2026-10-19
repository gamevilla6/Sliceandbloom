// Bundle a verified Android preview APK and production AAB with release
// instructions and the app's privacy policy. This does not build or sign either
// binary; the caller must first collect fresh outputs from the named profiles.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const appDir = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(appDir, '../..');
const outputDir = path.join(workspaceRoot, 'generated-artifacts/android');
const fsBin = 'unzip';
const apkPath = path.join(outputDir, 'slice-and-bloom-preview.apk');
const aabPath = path.join(outputDir, 'slice-and-bloom-production.aab');
const policyPath = path.join(appDir, 'privacy_policy.md');
const config = JSON.parse(fs.readFileSync(path.join(appDir, 'app.json'), 'utf8')).expo;

function makeReadme() {
  return `SLICE & BLOOM — ANDROID TEST AND PLAY RELEASE
Developer: ${config.extra.developerName}
Package: ${config.android.package}
Version: ${config.version} (version code ${config.android.versionCode})
Support: ${config.extra.supportEmail}

CONTENTS
- SliceAndBloom-debug-test.apk: installable QA build; package
  ${config.android.package}.preview; uses official Google test ad units.
- SliceAndBloom-production.aab: signed Play Store bundle; package
  ${config.android.package}; production AdMob configuration.
- privacy_policy.md: policy text for review and distribution.

INSTALL THE TEST APK
1. Transfer SliceAndBloom-debug-test.apk to an Android test device.
2. Open the file and allow installation for the file manager/browser if Android
   requests permission. Turn that permission off again when finished.
3. The preview app installs separately from the production package.
4. This build uses test ads and a public debug signing certificate. It is for
   QA only; do not upload the APK to Google Play or use it as a release build.

UPLOAD THE AAB TO GOOGLE PLAY
1. Open Google Play Console and select the existing Slice & Bloom app.
2. Start an Internal testing release (recommended for the first test).
3. Upload SliceAndBloom-production.aab and wait for Play's processing checks.
4. Complete the store listing, content rating, target audience, ads, Data
   safety, and privacy-policy URL declarations before inviting testers.
5. Review the generated device APKs and Play warnings before rollout.

The AAB is not directly installable. It must be uploaded through Play Console.
This archive does not itself publish the app. Confirm the support email, policy
URL, signing identity, ad declarations, and current Play requirements before
release. Keep this bundle private if the source or store materials are private.
`;
}

function verifyBundledConfig(bundled, preview) {
  assert.equal(bundled.extra?.supportEmail, config.extra.supportEmail,
    'Compiled artifact has an outdated support email; rebuild it.');
  assert.equal(bundled.extra?.developerName, config.extra.developerName);
  assert.equal(bundled.android?.package,
    `${config.android.package}${preview ? '.preview' : ''}`);
  assert.equal(bundled.version, config.version);
  assert.equal(bundled.android.versionCode, config.android.versionCode);
}

function main() {
  assert.equal(config.android.package, 'com.gamevilla.sliceandbloom');
  assert.equal(config.extra.developerName, 'Game Villa');
  assert.equal(config.extra.supportEmail, 'contact.gamevilla@gmail.com');
  assert.ok(fs.statSync(policyPath).size > 0, 'Missing privacy_policy.md.');
  for (const file of [apkPath, aabPath]) {
    assert.ok(fs.existsSync(file), `Missing compiled artifact: ${file}`);
    assert.ok(fs.statSync(file).size > 0, `Compiled artifact is empty: ${file}`);
  }
  // Inspect the compiled files themselves, not just potentially stale sidecar reports.
  verifyBundledConfig(JSON.parse(execFileSync(fsBin,
    ['-p', apkPath, 'assets/app.config'], { encoding: 'utf8' })), true);
  verifyBundledConfig(JSON.parse(execFileSync(fsBin,
    ['-p', aabPath, 'base/assets/app.config'], { encoding: 'utf8' })), false);

  const packageReport = path.join(outputDir, 'package.txt');
  assert.ok(fs.existsSync(packageReport), 'Missing APK package inspection report.');
  assert.equal(fs.readFileSync(packageReport, 'utf8').trim(),
    `${config.android.package}.preview`, 'APK is not the isolated preview build.');
  const signatureReport = path.join(outputDir, 'signature.txt');
  assert.ok(fs.existsSync(signatureReport), 'Missing APK signature inspection report.');
  assert.match(fs.readFileSync(signatureReport, 'utf8'), /CN=Android Debug/,
    'The QA APK must use the public debug signing certificate.');
  const aabEntries = execFileSync(fsBin, ['-Z1', aabPath], { encoding: 'utf8' });
  assert.match(aabEntries, /^META-INF\/[^/\r\n]+\.(?:RSA|DSA|EC)$/im,
    'Production AAB does not contain a JAR signing certificate.');
  assert.match(aabEntries, /^META-INF\/[^/\r\n]+\.SF$/im,
    'Production AAB does not contain a JAR signature file.');
  // Signature filenames alone are not proof of a valid, non-debug release.
  const verification = execFileSync('jarsigner', ['-verify', aabPath],
    { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
  assert.match(verification, /jar verified\./i, 'AAB signature verification failed.');
  assert.doesNotMatch(verification, /unsigned entries|jar is unsigned|treated as unsigned/i,
    'Production AAB contains unsigned or unverifiable content.');
  const certificate = execFileSync('keytool', ['-printcert', '-jarfile', aabPath],
    { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
  assert.doesNotMatch(certificate, /CN\s*=\s*Android Debug/i,
    'A debug-signed AAB must never be packaged as a production release.');

  fs.mkdirSync(outputDir, { recursive: true });
  const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice-bloom-release-'));
  const archivePath = path.join(outputDir, 'slice-and-bloom-android-release.zip');
  try {
    fs.rmSync(archivePath, { force: true });
    fs.copyFileSync(apkPath, path.join(stagingDir, 'SliceAndBloom-debug-test.apk'));
    fs.copyFileSync(aabPath, path.join(stagingDir, 'SliceAndBloom-production.aab'));
    fs.copyFileSync(policyPath, path.join(stagingDir, 'privacy_policy.md'));
    fs.writeFileSync(path.join(stagingDir, 'README.txt'), makeReadme());
    execFileSync('zip', ['-9', '-j', archivePath,
      'SliceAndBloom-debug-test.apk',
      'SliceAndBloom-production.aab',
      'privacy_policy.md',
      'README.txt'], { cwd: stagingDir, stdio: 'inherit' });
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  console.log(`Release package created: ${archivePath}`);
}

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { makeReadme, verifyBundledConfig };
