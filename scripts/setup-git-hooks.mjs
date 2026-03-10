import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();
const hooksPath = resolve(repoRoot, '.githooks');

execFileSync('git', ['config', 'core.hooksPath', hooksPath], {
  cwd: repoRoot,
  stdio: 'inherit',
});

process.stdout.write(`Configured git hooks at ${hooksPath}\n`);