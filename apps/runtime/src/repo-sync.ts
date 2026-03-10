import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';

import { log } from './logger';
import {
  LocalRepoRegistry,
  type LocalRepoRegistration,
  type RepoRegistryProject,
} from './repo-registry';

const execFileAsync = promisify(execFile);

type GitCommandResult = {
  stdout: string;
  stderr: string;
};

export class RepoSyncService {
  public constructor(private readonly localRepoRegistry: LocalRepoRegistry) {}

  public async ensureProjectRepository(
    project: RepoRegistryProject,
  ): Promise<LocalRepoRegistration> {
    const registration = await this.localRepoRegistry.upsertProject(project);

    await this.validateRemote(project);

    if (!registration.existsOnDisk) {
      await this.cloneProject(project, registration.localPath);
    } else {
      await this.syncProject(project, registration.localPath);
    }

    return this.localRepoRegistry.upsertProject(project);
  }

  public async validateRemote(project: RepoRegistryProject): Promise<void> {
    const branchToValidate =
      project.repository.baseBranch || project.repository.defaultBranch;
    const result = await this.runGit(
      ['ls-remote', '--heads', project.repository.url, branchToValidate],
      undefined,
      {
        allowEmptyStdout: true,
      },
    );

    if (!result.stdout.trim()) {
      throw new Error(
        `Remote branch ${branchToValidate} was not found for ${project.repository.url}.`,
      );
    }
  }

  public async syncBranch(
    repositoryPath: string,
    branchName: string,
    remoteName = 'origin',
  ): Promise<void> {
    const remoteBranchRef = `${remoteName}/${branchName}`;

    try {
      await this.runGit(['checkout', branchName], repositoryPath);
    } catch {
      await this.runGit(
        ['checkout', '-B', branchName, remoteBranchRef],
        repositoryPath,
      );
    }

    await this.runGit(['pull', '--ff-only', remoteName, branchName], repositoryPath);
  }

  private async cloneProject(
    project: RepoRegistryProject,
    localPath: string,
  ): Promise<void> {
    await mkdir(dirname(localPath), { recursive: true });
    await this.runGit(
      [
        'clone',
        '--origin',
        'origin',
        '--branch',
        project.repository.defaultBranch,
        project.repository.url,
        localPath,
      ],
      undefined,
    );

    await this.ensureRemote(localPath, project.repository.url);
    await this.runGit(['fetch', '--prune', 'origin'], localPath);
    await this.syncBranch(localPath, project.repository.baseBranch);

    log('info', 'Repository cloned for runtime project.', {
      projectId: project.id,
      localPath,
      branch: project.repository.baseBranch,
    });
  }

  private async syncProject(
    project: RepoRegistryProject,
    localPath: string,
  ): Promise<void> {
    await this.ensureRemote(localPath, project.repository.url);
    await this.runGit(['fetch', '--prune', 'origin'], localPath);
    await this.syncBranch(localPath, project.repository.baseBranch);

    log('info', 'Repository synced for runtime project.', {
      projectId: project.id,
      localPath,
      branch: project.repository.baseBranch,
    });
  }

  private async ensureRemote(
    repositoryPath: string,
    expectedUrl: string,
  ): Promise<void> {
    try {
      const remote = await this.runGit(
        ['remote', 'get-url', 'origin'],
        repositoryPath,
      );

      if (remote.stdout.trim() !== expectedUrl) {
        await this.runGit(
          ['remote', 'set-url', 'origin', expectedUrl],
          repositoryPath,
        );
      }
    } catch {
      await this.runGit(['remote', 'add', 'origin', expectedUrl], repositoryPath);
    }
  }

  private async runGit(
    args: string[],
    cwd?: string,
    options?: { allowEmptyStdout?: boolean },
  ): Promise<GitCommandResult> {
    const result = await execFileAsync('git', args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (!options?.allowEmptyStdout && !result.stdout && result.stderr) {
      log('debug', 'Git command produced stderr.', {
        args,
        cwd: cwd ?? null,
        stderr: result.stderr.trim(),
      });
    }

    return {
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
}