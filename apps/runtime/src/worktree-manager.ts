import { execFile } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import { log } from './logger';

const execFileAsync = promisify(execFile);

const sanitizeSegment = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
};

export interface PreparedWorktree {
  path: string;
  branchName: string;
  baseBranch: string;
  headSha: string;
  isDirty: boolean;
}

export class WorktreeManager {
  private readonly worktreesRoot: string;

  public constructor(repositoriesRoot: string) {
    this.worktreesRoot = join(repositoriesRoot, 'worktrees');
  }

  public resolveWorktreePath(projectSlug: string, workItemId: string): string {
    const slug = sanitizeSegment(projectSlug) || 'project';
    const workItem = sanitizeSegment(workItemId) || 'work-item';
    return join(this.worktreesRoot, `${slug}--${workItem}`);
  }

  public async ensureWorktree(input: {
    repositoryPath: string;
    projectSlug: string;
    workItemId: string;
    branchName: string;
    baseBranch: string;
  }): Promise<PreparedWorktree> {
    const worktreePath = this.resolveWorktreePath(
      input.projectSlug,
      input.workItemId,
    );
    await mkdir(dirname(worktreePath), { recursive: true });

    const knownWorktrees = await this.runGit(
      ['worktree', 'list', '--porcelain'],
      input.repositoryPath,
    );

    if (!knownWorktrees.stdout.includes(`worktree ${worktreePath}`)) {
      await this.runGit(
        ['worktree', 'add', '-B', input.branchName, worktreePath, input.branchName],
        input.repositoryPath,
      );
    }

    const [headSha, isDirty] = await Promise.all([
      this.getHeadSha(worktreePath),
      this.isDirty(worktreePath),
    ]);

    log('info', 'Prepared canonical worktree.', {
      repositoryPath: input.repositoryPath,
      worktreePath,
      branchName: input.branchName,
      baseBranch: input.baseBranch,
      isDirty,
    });

    return {
      path: worktreePath,
      branchName: input.branchName,
      baseBranch: input.baseBranch,
      headSha,
      isDirty,
    };
  }

  public async isDirty(worktreePath: string): Promise<boolean> {
    const result = await this.runGit(['status', '--porcelain'], worktreePath);
    return result.stdout.trim().length > 0;
  }

  public async isStale(
    repositoryPath: string,
    worktreePath: string,
  ): Promise<boolean> {
    try {
      await access(worktreePath);
    } catch {
      return true;
    }

    const knownWorktrees = await this.runGit(
      ['worktree', 'list', '--porcelain'],
      repositoryPath,
    );

    return !knownWorktrees.stdout.includes(`worktree ${worktreePath}`);
  }

  public async cleanupWorktree(
    repositoryPath: string,
    worktreePath: string,
  ): Promise<void> {
    await this.runGit(['worktree', 'remove', '--force', worktreePath], repositoryPath);
  }

  public async archiveWorktree(
    repositoryPath: string,
    worktreePath: string,
  ): Promise<void> {
    await this.cleanupWorktree(repositoryPath, worktreePath);
  }

  private async getHeadSha(worktreePath: string): Promise<string> {
    const result = await this.runGit(['rev-parse', 'HEAD'], worktreePath);
    return result.stdout.trim();
  }

  private async runGit(args: string[], cwd: string): Promise<{ stdout: string }> {
    const result = await execFileAsync('git', args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      stdout: result.stdout,
    };
  }
}