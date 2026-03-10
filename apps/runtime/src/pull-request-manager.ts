import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { log } from './logger';
import { RuntimeApiClient } from './runtime-api-client';

const execFileAsync = promisify(execFile);

export interface PullRequestMetadata {
  number: number;
  url: string;
}

export class PullRequestManager {
  public constructor(private readonly runtimeApiClient: RuntimeApiClient) {}

  public async createOrUpdatePullRequest(input: {
    projectId: string;
    workItemId: string;
    leaseId: string;
    status: 'active' | 'lockedByDev' | 'lockedByReview' | 'lockedByRelease';
    path: string;
    branchName: string;
    baseBranch: string;
    headSha: string;
    isDirty: boolean;
    details: string;
    owner: string;
    repo: string;
    title: string;
    body: string;
    existingPullRequestUrl?: string;
  }): Promise<PullRequestMetadata> {
    const existing = await this.findOpenPullRequest(
      input.owner,
      input.repo,
      input.branchName,
    );

    const pullRequest = existing
      ? await this.updatePullRequest(input.owner, input.repo, existing.number, {
          title: input.title,
          body: input.body,
        })
      : await this.createPullRequest(input.owner, input.repo, {
          baseBranch: input.baseBranch,
          headBranch: input.branchName,
          title: input.title,
          body: input.body,
        });

    await this.runtimeApiClient.upsertWorktree({
      projectId: input.projectId,
      workItemId: input.workItemId,
      leaseId: input.leaseId,
      status: input.status,
      path: input.path,
      branchName: input.branchName,
      baseBranch: input.baseBranch,
      headSha: input.headSha,
      pullRequestUrl: pullRequest.url,
      isDirty: input.isDirty,
      details: input.details,
    });

    return pullRequest;
  }

  public async addComment(input: {
    owner: string;
    repo: string;
    pullRequestNumber: number;
    body: string;
  }): Promise<void> {
    await this.runGh(
      [
        'pr',
        'comment',
        String(input.pullRequestNumber),
        '--repo',
        `${input.owner}/${input.repo}`,
        '--body',
        input.body,
      ],
      process.cwd(),
    );
  }

  private async findOpenPullRequest(
    owner: string,
    repo: string,
    headBranch: string,
  ): Promise<PullRequestMetadata | null> {
    const result = await this.runGh(
      [
        'pr',
        'list',
        '--repo',
        `${owner}/${repo}`,
        '--head',
        headBranch,
        '--state',
        'open',
        '--json',
        'number,url',
      ],
      process.cwd(),
    );

    const items = JSON.parse(result.stdout) as Array<PullRequestMetadata>;
    return items[0] ?? null;
  }

  private async createPullRequest(
    owner: string,
    repo: string,
    input: {
      baseBranch: string;
      headBranch: string;
      title: string;
      body: string;
    },
  ): Promise<PullRequestMetadata> {
    await this.runGh(
      [
        'pr',
        'create',
        '--repo',
        `${owner}/${repo}`,
        '--base',
        input.baseBranch,
        '--head',
        input.headBranch,
        '--title',
        input.title,
        '--body',
        input.body,
      ],
      process.cwd(),
    );

    const created = await this.findOpenPullRequest(owner, repo, input.headBranch);

    if (!created) {
      throw new Error('Pull request creation completed but no open pull request was found.');
    }

    return created;
  }

  private async updatePullRequest(
    owner: string,
    repo: string,
    number: number,
    input: { title: string; body: string },
  ): Promise<PullRequestMetadata> {
    await this.runGh(
      [
        'pr',
        'edit',
        String(number),
        '--repo',
        `${owner}/${repo}`,
        '--title',
        input.title,
        '--body',
        input.body,
      ],
      process.cwd(),
    );

    const result = await this.runGh(
      [
        'pr',
        'view',
        String(number),
        '--repo',
        `${owner}/${repo}`,
        '--json',
        'number,url',
      ],
      process.cwd(),
    );

    return JSON.parse(result.stdout) as PullRequestMetadata;
  }

  private async runGh(args: string[], cwd: string): Promise<{ stdout: string }> {
    const result = await execFileAsync('gh', args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });

    log('info', 'Executed GitHub CLI pull request command.', {
      args,
    });

    return {
      stdout: result.stdout,
    };
  }
}