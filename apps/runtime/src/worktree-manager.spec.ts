import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

import { BranchManager } from './branch-manager';
import { WorktreeManager } from './worktree-manager';

const execFileAsync = promisify(execFile);

describe('WorktreeManager', () => {
  it('creates a canonical worktree and reports clean state', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'evolvo-runtime-worktree-'));
    const repoPath = join(workspace, 'repo');
    await execFileAsync('git', ['init', '-b', 'main', repoPath]);
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoPath });
    await execFileAsync('git', ['config', 'user.name', 'Runtime Test'], { cwd: repoPath });
    await writeFile(join(repoPath, 'README.md'), 'worktree\n', 'utf8');
    await execFileAsync('git', ['add', '.'], { cwd: repoPath });
    await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: repoPath });
    await execFileAsync('git', ['remote', 'add', 'origin', repoPath], { cwd: repoPath });

    const branchManager = new BranchManager();
    const branchName = branchManager.createBranchName({
      projectSlug: 'project-one',
      workItemId: 'work-1',
      title: 'Create worktree',
      lane: 'dev',
    });
    await branchManager.ensureWorkItemBranch({
      repositoryPath: repoPath,
      branchName,
      baseBranch: 'main',
    });

    const manager = new WorktreeManager(workspace);
    const result = await manager.ensureWorktree({
      repositoryPath: repoPath,
      projectSlug: 'project-one',
      workItemId: 'work-1',
      branchName,
      baseBranch: 'main',
    });

    expect(result.path).toContain('project-one--work-1');
    expect(result.headSha.length).toBeGreaterThan(0);
    expect(result.isDirty).toBe(false);
  });
});