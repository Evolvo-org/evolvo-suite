import { execFile } from 'node:child_process';
import { basename } from 'node:path';
import { promisify } from 'node:util';

import type { RuntimeArtifactUploadMetadataResponse } from '@repo/shared';

import type { ArtifactReporter } from './artifact-reporter';

const execFileAsync = promisify(execFile);

const sanitizeSegment = (value: string): string => {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9 -]+/g, '')
    .trim();
};

export interface DiffSummary {
  shortStatus: string;
  stat: string;
  patch: string;
}

export interface CommitExecutionResult {
  committed: boolean;
  commitMessage: string;
  commitSha: string | null;
  diffSummary: DiffSummary;
  patchArtifact: RuntimeArtifactUploadMetadataResponse | null;
}

export class ChangeManager {
  public async generateDiffSummary(cwd: string): Promise<DiffSummary> {
    const [shortStatus, stat, patch] = await Promise.all([
      this.runGit(['status', '--short'], cwd),
      this.runGit(['diff', '--stat'], cwd),
      this.runGit(['diff'], cwd),
    ]);

    return {
      shortStatus: shortStatus.stdout.trim(),
      stat: stat.stdout.trim(),
      patch: patch.stdout,
    };
  }

  public generateCommitMessage(input: {
    workItemId: string;
    title: string;
    lane: string;
  }): string {
    const title = sanitizeSegment(input.title) || 'runtime update';
    return `chore(${input.lane}): ${title} [${input.workItemId}]`;
  }

  public async createCommit(input: {
    cwd: string;
    message: string;
    runtimeId: string;
    leaseId: string;
    artifactReporter?: ArtifactReporter;
  }): Promise<CommitExecutionResult> {
    const diffSummary = await this.generateDiffSummary(input.cwd);

    if (!diffSummary.shortStatus) {
      return {
        committed: false,
        commitMessage: input.message,
        commitSha: null,
        diffSummary,
        patchArtifact: null,
      };
    }

    await this.runGit(['add', '-A'], input.cwd);
    await this.runGit(['commit', '-m', input.message], input.cwd);
    const sha = await this.runGit(['rev-parse', 'HEAD'], input.cwd);

    const patchArtifact = input.artifactReporter
      ? await input.artifactReporter.reportArtifactMetadata({
          runtimeId: input.runtimeId,
          leaseId: input.leaseId,
          artifactType: 'patch',
          fileName: `${basename(input.cwd)}.patch`,
          contentType: 'text/x-diff',
          sizeBytes: Buffer.byteLength(diffSummary.patch, 'utf8'),
        })
      : null;

    return {
      committed: true,
      commitMessage: input.message,
      commitSha: sha.stdout.trim(),
      diffSummary,
      patchArtifact,
    };
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