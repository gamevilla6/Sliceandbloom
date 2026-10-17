#!/usr/bin/env bash
# Run only on the disposable, user-approved Expo Linux sandbox.
# Invoke the whole script with timeout 2700s; stop the sandbox after collecting
# its APK artifact. This builds with Gradle, not EAS CLI or Expo Launch.
set -Eeuo pipefail
if [[ "$PWD" != /tmp/slice-bloom-apk || ! -f .approved-expo-build ]]; then
  echo "Refusing to modify anything outside the approved disposable Expo checkout." >&2
  exit 1
fi
export CI=1 EXPO_PUBLIC_ADMOB_TEST_ADS=true CMAKE_BUILD_PARALLEL_LEVEL=2

# Expo's Linux image supplies NVM, Java and Android SDK. Match the project's
# pinned runtime/package manager without changing the Replit environment.
set +u
source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
nvm install 24.13.0
nvm use 24.13.0
set -u
corepack enable
corepack prepare pnpm@10.26.1 --activate
pnpm --filter @workspace/cloud-garden... install --frozen-lockfile
pnpm --filter @workspace/cloud-garden run release:check

# Only this remote copy gets a preview identity. No production signing keys,
# app IDs or saved data in the original project are modified.
node <<'NODE'
const fs = require('node:fs');
const preview = require('./artifacts/cloud-garden/scripts/prepare-preview-apk.cjs');
const file = 'artifacts/cloud-garden/app.json';
fs.writeFileSync(file, `${JSON.stringify(preview.previewConfig(JSON.parse(fs.readFileSync(file, 'utf8'))), null, 2)}\n`);
NODE
cd artifacts/cloud-garden
pnpm exec expo prebuild --platform android --no-install
node <<'NODE'
const fs = require('node:fs'), path = require('node:path');
const preview = require('./scripts/prepare-preview-apk.cjs');
preview.verifySigning(fs.readFileSync('android/app/build.gradle', 'utf8'));
if (!fs.existsSync('android/app/debug.keystore')) throw new Error('Missing template debug keystore.');
const rn = path.dirname(require.resolve('react-native/package.json'));
fs.writeFileSync('/tmp/slice-bloom-sdk-packages.txt',
  preview.sdkPackages(fs.readFileSync(path.join(rn, 'gradle/libs.versions.toml'), 'utf8')).join('\n') + '\n');
NODE
mapfile -t sdk_packages < /tmp/slice-bloom-sdk-packages.txt
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" "${sdk_packages[@]}"
cd android
chmod +x gradlew
./gradlew :app:assembleRelease --no-daemon --max-workers=2 \
  -PreactNativeArchitectures=arm64-v8a,armeabi-v7a \
  '-Dorg.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=768m'

mkdir -p /tmp/slice-bloom-apk/output
apk=app/build/outputs/apk/release/app-release.apk
test -s "$apk"
build_tools=$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -n 1)
"$build_tools/apksigner" verify --verbose --print-certs "$apk" > /tmp/slice-bloom-apk/output/signature.txt
grep -Eq 'Signer #1 certificate DN:.*CN=Android Debug' /tmp/slice-bloom-apk/output/signature.txt
analyzer="$ANDROID_HOME/cmdline-tools/latest/bin/apkanalyzer"
"$analyzer" manifest application-id "$apk" > /tmp/slice-bloom-apk/output/package.txt
grep -qx 'com.gamevilla.sliceandbloom.preview' /tmp/slice-bloom-apk/output/package.txt
"$analyzer" manifest print "$apk" > /tmp/slice-bloom-apk/output/manifest.xml
cp "$apk" /tmp/slice-bloom-apk/output/slice-and-bloom-preview.apk
cd /tmp/slice-bloom-apk/output
sha256sum slice-and-bloom-preview.apk > SHA256SUMS.txt
echo "APK_READY: /tmp/slice-bloom-apk/output/slice-and-bloom-preview.apk"
