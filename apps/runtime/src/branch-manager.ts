import { execFile } from 'node:child_process';
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
    .slice(0, 40);
};

export class BranchManager {
  public createBranchName(input: {
    projectSlug: string;
    workItemId: string;
    title: string;
    lane: string;
  }): string {
    const project = sanitizeSegment(input.projectSlug) || 'project';
    const lane = sanitizeSegment(input.lane) || 'dev';
    const workItemId = sanitizeSegment(input.workItemId) || 'work-item';
    const title = sanitizeSegment(input.title) || 'task';

    return `evolvo/${project}/${lane}/${workItemId}-${title}`;
  }

  public getBaseBranch(input: {
    baseBranch?: string;
    defaultBranch: string;
  }): string {
    return input.baseBranch?.trim() || input.defaultBranch.trim();
  }

  public async ensureWorkItemBranch(input: {
    repositoryPath: string;
    branchName: string;
    baseBranch: string;
  }): Promise<void> {
    const remoteBranchRef = `origin/${input.baseBranch}`;

    await this.runGit(['fetch', '--prune', 'origin'], input.repositoryPath);

    const existingBranches = await this.runGit(
      ['branch', '--list', input.branchName],
      input.repositoryPath,
    );

    if (existingBranches.stdout.trim()) {
      await this.runGit(
        ['branch', '-f', input.branchName, remoteBranchRef],
        input.repositoryPath,
      );
    } else {
      await this.runGit(
        ['branch', input.branchName, remoteBranchRef],
        input.repositoryPath,
      );
    }

    log('info', 'Prepared work item branch.', {
      repositoryPath: input.repositoryPath,
      branchName: input.branchName,
      baseBranch: input.baseBranch,
    });
  }

  public async getCleanupCandidates(input: {
    repositoryPath: string;
    activeBranches: string[];
  }): Promise<string[]> {
    const result = await this.runGit(
      ['branch', '--format', '%(refname:short)'],
      input.repositoryPath,
    );

    const active = new Set(input.activeBranches);

    return result.stdout
      .split('\n')
      .map((value) => value.trim())
      .filter((value) => value.startsWith('evolvo/'))
      .filter((value) => !active.has(value));
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