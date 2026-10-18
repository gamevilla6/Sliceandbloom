/**
 * Evidence inventory, not a legal-clearance or license-notice generator.
 * Uses the installed app dependency metadata; never downloads media/packages.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const appRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(appRoot, '../..');
const output = path.join(appRoot, 'docs', 'licensing-inventory.json');
const appPackage = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
const licenses = JSON.parse(execFileSync('pnpm', [
  '--filter', appPackage.name, 'licenses', 'list', '--json',
], { cwd: workspaceRoot, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));

const directDependencies = Object.keys({
  ...appPackage.dependencies, ...appPackage.devDependencies,
}).sort().map((name) => {
  const dependency = JSON.parse(fs.readFileSync(
    path.join(appRoot, 'node_modules', name, 'package.json'), 'utf8'));
  return {
    name, version: dependency.version,
    declaredLicense: dependency.license || dependency.licenses || 'UNDECLARED',
    classification: name.startsWith('@workspace/') ? 'first-party workspace code' :
      name === 'create-launch' ? 'development launcher; license terms require confirmation' :
        'third-party',
  };
});

const packages = Object.entries(licenses).flatMap(([license, entries]) =>
  entries.map((entry) => ({
    name: entry.name, versions: entry.versions, declaredLicense: license,
    homepage: entry.homepage || null,
    licenseFiles: [...new Set(entry.paths.flatMap((directory) =>
      fs.existsSync(directory) ? fs.readdirSync(directory).filter((name) =>
        /^(licen[sc]e|copying|notice|copyright|ofl)([._-].*)?$/i.test(name)) : [],
    ))].sort(),
  })),
).sort((a, b) => a.name.localeCompare(b.name));

const assets = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) { walk(absolute); continue; }
    const relative = path.relative(appRoot, absolute).split(path.sep).join('/');
    const data = fs.readFileSync(absolute);
    assets.push({
      path: relative, bytes: data.length,
      sha256: crypto.createHash('sha256').update(data).digest('hex'),
      evidence: relative.startsWith('assets/audio/') && /\.wav$/i.test(relative)
        ? 'Compare against scripts/generate-hardcore-audio.py --check; sample-free synthesis'
        : relative.endsWith('/garden-icon.png')
          ? 'Legacy unused icon; independent creation/source record not retained'
          : 'Custom Game Mood icon family from earlier project generation; legal/trademark clearance not established',
    });
  }
}
walk(path.join(appRoot, 'assets'));
assets.sort((a, b) => a.path.localeCompare(b.path));

const inventory = {
  scope: 'Installed Slice & Bloom npm metadata, including build/development dependencies, and all files in its assets directory',
  limitations: [
    'Declared package licenses are not legal clearance or proof that all required notices are distributed.',
    'This does not inventory native Maven, CocoaPods, or platform libraries in a signed APK/AAB.',
    'Google Mobile Ads native SDK terms must be reviewed separately from its Apache-2.0 React Native wrapper.',
    'Asset hashes identify reviewed bytes; they do not establish ownership or non-infringement.',
  ],
  counts: { packageRecords: packages.length, directDependencies: directDependencies.length, assets: assets.length },
  directDependencies, packages, assets,
};
fs.writeFileSync(output, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Wrote ${path.relative(workspaceRoot, output)}: ${packages.length} package records, ${assets.length} assets`);
