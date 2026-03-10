import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packagePaths = ['apps/api/package.json', 'apps/web/package.json'];
const isDryRun = process.argv.includes('--dry-run');

const bumpPatchVersion = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)(-.+)?$/.exec(version);

  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  const [, major, minor, patch, suffix] = match;
  const nextPatch = Number.parseInt(patch, 10) + 1;

  return `${major}.${minor}.${nextPatch}${suffix ?? ''}`;
};

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();

const updates = [];

for (const relativePath of packagePaths) {
  const filePath = resolve(repoRoot, relativePath);
  const packageJson = JSON.parse(readFileSync(filePath, 'utf8'));
  const currentVersion = packageJson.version;
  const nextVersion = bumpPatchVersion(currentVersion);

  packageJson.version = nextVersion;
  updates.push({ relativePath, currentVersion, nextVersion, filePath, packageJson });
}

for (const update of updates) {
  if (!isDryRun) {
    writeFileSync(
      update.filePath,
      `${JSON.stringify(update.packageJson, null, 2)}\n`,
      'utf8',
    );
  }

  process.stdout.write(
    `${isDryRun ? '[dry-run] ' : ''}${update.relativePath}: ${update.currentVersion} -> ${update.nextVersion}\n`,
  );
}

if (!isDryRun) {
  execFileSync('git', ['add', ...packagePaths], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}