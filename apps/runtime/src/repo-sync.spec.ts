import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

import { LocalRepoRegistry } from './repo-registry';
import { RepoSyncService } from './repo-sync';

const execFileAsync = promisify(execFile);

describe('RepoSyncService', () => {
  it('clones and syncs a repository from origin', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'evolvo-runtime-repo-sync-'));
    const originPath = join(workspace, 'origin.git');
    const seedPath = join(workspace, 'seed');
    const runtimeRoot = join(workspace, 'runtime');

    await execFileAsync('git', ['init', '--bare', originPath]);
    await execFileAsync('git', ['init', '-b', 'main', seedPath]);
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: seedPath });
    await execFileAsync('git', ['config', 'user.name', 'Runtime Test'], { cwd: seedPath });
    await writeFile(join(seedPath, 'README.md'), 'initial\n', 'utf8');
    await execFileAsync('git', ['add', '.'], { cwd: seedPath });
    await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: seedPath });
    await execFileAsync('git', ['remote', 'add', 'origin', originPath], { cwd: seedPath });
    await execFileAsync('git', ['push', '-u', 'origin', 'main'], { cwd: seedPath });

    const registry = new LocalRepoRegistry(runtimeRoot);
    const service = new RepoSyncService(registry);

    const first = await service.ensureProjectRepository({
      id: 'project-1',
      slug: 'project-one',
      repository: {
        owner: 'local',
        name: 'origin',
        url: originPath,
        defaultBranch: 'main',
        baseBranch: 'main',
      },
    });

    expect(first.existsOnDisk).toBe(true);

    await writeFile(join(seedPath, 'README.md'), 'updated\n', 'utf8');
    await execFileAsync('git', ['add', '.'], { cwd: seedPath });
    await execFileAsync('git', ['commit', '-m', 'update'], { cwd: seedPath });
    await execFileAsync('git', ['push'], { cwd: seedPath });

    const second = await service.ensureProjectRepository({
      id: 'project-1',
      slug: 'project-one',
      repository: {
        owner: 'local',
        name: 'origin',
        url: originPath,
        defaultBranch: 'main',
        baseBranch: 'main',
      },
    });

    const clonedReadme = await readFile(join(second.localPath, 'README.md'), 'utf8');
    expect(clonedReadme).toContain('updated');
  });

  it('falls back to the remote default branch when the configured branch is missing', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'evolvo-runtime-repo-sync-'));
    const originPath = join(workspace, 'origin.git');
    const seedPath = join(workspace, 'seed');
    const runtimeRoot = join(workspace, 'runtime');

    await execFileAsync('git', ['init', '--bare', originPath]);
    await execFileAsync('git', ['init', '-b', 'master', seedPath]);
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: seedPath });
    await execFileAsync('git', ['config', 'user.name', 'Runtime Test'], { cwd: seedPath });
    await writeFile(join(seedPath, 'README.md'), 'initial\n', 'utf8');
    await execFileAsync('git', ['add', '.'], { cwd: seedPath });
    await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: seedPath });
    await execFileAsync('git', ['remote', 'add', 'origin', originPath], { cwd: seedPath });
    await execFileAsync('git', ['push', '-u', 'origin', 'master'], { cwd: seedPath });

    const registry = new LocalRepoRegistry(runtimeRoot);
    const service = new RepoSyncService(registry);

    const registration = await service.ensureProjectRepository({
      id: 'project-1',
      slug: 'project-one',
      repository: {
        owner: 'local',
        name: 'origin',
        url: originPath,
        defaultBranch: 'main',
        baseBranch: 'main',
      },
    });

    expect(registration.repository.defaultBranch).toBe('master');
    expect(registration.repository.baseBranch).toBe('master');
    const clonedReadme = await readFile(join(registration.localPath, 'README.md'), 'utf8');
    expect(clonedReadme).toContain('initial');
  });

  it('bootstraps an empty remote repository with the configured base branch', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'evolvo-runtime-repo-sync-'));
    const originPath = join(workspace, 'origin.git');
    const runtimeRoot = join(workspace, 'runtime');

    await execFileAsync('git', ['init', '--bare', originPath]);

    const registry = new LocalRepoRegistry(runtimeRoot);
    const service = new RepoSyncService(registry);

    const registration = await service.ensureProjectRepository({
      id: 'project-2',
      slug: 'project-two',
      repository: {
        owner: 'local',
        name: 'origin',
        url: originPath,
        defaultBranch: 'main',
        baseBranch: 'main',
      },
    });

    const remoteHeads = await execFileAsync('git', ['ls-remote', '--heads', originPath, 'main']);
    expect(remoteHeads.stdout).toContain('refs/heads/main');
    const localHead = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: registration.localPath,
    });
    expect(localHead.stdout.trim()).toBe('main');
  });
});