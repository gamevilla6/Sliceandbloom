#!/usr/bin/env node
/** Honest source/setup delivery: never substitutes a QA binary for a signed AAB. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const app = path.resolve(__dirname, '..');
const root = path.resolve(app, '../..');
const out = path.join(root, 'generated-artifacts/android');
fs.mkdirSync(out, { recursive: true });
const stage = fs.mkdtempSync(path.join(out, 'online-setup-stage-'));
const archive = path.join(out, 'SliceAndBloom-Online-Only-SETUP.zip');
const config = JSON.parse(fs.readFileSync(path.join(app, 'app.json'), 'utf8')).expo;
if (config.android.package !== 'com.gamevilla.sliceandbloom'
  || config.extra.developerName !== 'Game Villa'
  || config.extra.supportEmail !== 'contact.gamevilla@gmail.com') {
  throw new Error('Unexpected branding in source.');
}
const short = fs.readFileSync(path.join(app, 'store-listing/short-description.txt'), 'utf8').trim();
const full = fs.readFileSync(path.join(app, 'store-listing/full-description.txt'), 'utf8').trim();
if (short.length > 80 || full.length > 4000) throw new Error('Play description exceeds length limit.');
const inventory = [];
function copy(source, destination, fingerprint = false) {
  const target = path.join(stage, destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  if (fingerprint) inventory.push({
    path: destination.replace(/^source-overlay\//, ''),
    sha256: crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),
  });
}
function copyTree(directory, destination) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    const source = path.join(directory, entry.name);
    const target = `${destination}/${entry.name}`;
    if (entry.isDirectory()) copyTree(source, target);
    else if (/\.(tsx?|[cm]?js|json|png|jpe?g|webp|svg|mp3|wav|ogg|ttf|otf|md|txt|ya?ml)$/.test(entry.name)) {
      copy(source, target, true);
    }
  }
}
try {
  copy(path.join(app, 'docs/online-setup-README.txt'), 'README.txt');
  copy(path.join(app, 'privacy_policy.md'), 'privacy_policy.md');
  copy(path.join(app, 'docs/online-only-release.md'), 'online-only-release.md');
  for (const file of ['short-description.txt', 'full-description.txt']) {
    copy(path.join(app, 'store-listing', file), `store-listing/${file}`);
  }
  for (const directory of ['app', 'components', 'hooks', 'lib', 'constants', 'assets', 'scripts', 'tests', 'store-listing']) {
    copyTree(path.join(app, directory), `source-overlay/artifacts/cloud-garden/${directory}`);
  }
  for (const file of fs.readdirSync(app)) {
    if (/^(app\.json|eas\.json|package\.json|tsconfig\.json|expo-env\.d\.ts|babel\.config\.[cm]?js|metro\.config\.[cm]?js|privacy_policy\.md)$/.test(file)) {
      copy(path.join(app, file), `source-overlay/artifacts/cloud-garden/${file}`, true);
    }
  }
  for (const file of ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'tsconfig.base.json']) {
    if (fs.existsSync(path.join(root, file))) copy(path.join(root, file), `source-overlay/${file}`, true);
  }
  for (const file of ['online-only-release.md', 'online-setup-README.txt', 'online-only-verification.txt']) {
    copy(path.join(app, 'docs', file), `source-overlay/artifacts/cloud-garden/docs/${file}`, true);
  }
  fs.writeFileSync(path.join(stage, 'source-fingerprints.json'), JSON.stringify({
    kind: 'source-setup-only', productionAabIncluded: false, files: inventory,
  }, null, 2) + '\n');
  const verification = path.join(app, 'docs/online-only-verification.txt');
  copy(verification, 'verification.txt');
  if (fs.existsSync(archive)) fs.unlinkSync(archive);
  execFileSync('zip', ['-q', '-9', '-r', archive, '.'], { cwd: stage });
  execFileSync('unzip', ['-tq', archive], { stdio: 'inherit' });
  const entries = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trim().split('\n');
  if (entries.some(file => /\.(aab|apk|jks|keystore)$/.test(file) || /(^|\/)(\.env|credentials\.json)/.test(file))) {
    fs.unlinkSync(archive);
    throw new Error('Setup archive must not contain native binaries or credentials.');
  }
  console.log(JSON.stringify({
    archive: path.relative(root, archive), bytes: fs.statSync(archive).size,
    sourceFiles: inventory.length, shortDescriptionLength: short.length, fullDescriptionLength: full.length,
    productionAabIncluded: false,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),
  }, null, 2));
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}
