import { execFile } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';

import { log } from './logger';
import type {
  LocalRepoRegistry,
  LocalRepoRegistration,
  RepoRegistryProject,
} from './repo-registry';

const execFileAsync = promisify(execFile);

type GitCommandResult = {
  stdout: string;
  stderr: string;
};

type RemoteRepositoryInspection = {
  project: RepoRegistryProject;
  remoteBranches: string[];
  isEmpty: boolean;
};

export class RepoSyncService {
  public constructor(private readonly localRepoRegistry: LocalRepoRegistry) {}

  public async ensureProjectRepository(
    project: RepoRegistryProject,
  ): Promise<LocalRepoRegistration> {
    const inspection = await this.resolveRemoteRepository(project);
    const registration = await this.localRepoRegistry.upsertProject(inspection.project);
    const hasUsableRepository =
      registration.existsOnDisk &&
      (await this.isGitRepository(registration.localPath));

    if (registration.existsOnDisk && !hasUsableRepository) {
      log('warn', 'Runtime found a stale local repository path and will reclone it.', {
        projectId: project.id,
        localPath: registration.localPath,
      });

      await rm(registration.localPath, { recursive: true, force: true });
    }

    if (!hasUsableRepository) {
      await this.cloneProject(
        inspection.project,
        registration.localPath,
        inspection.isEmpty,
      );
    } else {
      await this.syncProject(
        inspection.project,
        registration.localPath,
        inspection.isEmpty,
      );
    }

    return this.localRepoRegistry.upsertProject(inspection.project);
  }

  private async isGitRepository(repositoryPath: string): Promise<boolean> {
    try {
      const result = await this.runGit(
        ['rev-parse', '--is-inside-work-tree'],
        repositoryPath,
        { allowEmptyStdout: true },
      );

      return result.stdout.trim() === 'true';
    } catch {
      return false;
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
    isEmptyRemote: boolean,
  ): Promise<void> {
    await mkdir(dirname(localPath), { recursive: true });
    if (isEmptyRemote) {
      await this.runGit(
        ['clone', '--origin', 'origin', project.repository.url, localPath],
        undefined,
      );
      await this.bootstrapEmptyRemote(project, localPath);
    } else {
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
    }

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
    isEmptyRemote: boolean,
  ): Promise<void> {
    await this.ensureRemote(localPath, project.repository.url);
    if (isEmptyRemote) {
      await this.bootstrapEmptyRemote(project, localPath);
    }
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

  private async resolveRemoteRepository(
    project: RepoRegistryProject,
  ): Promise<RemoteRepositoryInspection> {
    const configuredDefaultBranch = project.repository.defaultBranch.trim();
    const configuredBaseBranch =
      project.repository.baseBranch.trim() || configuredDefaultBranch;
    const remoteBranches = await this.listRemoteBranches(project.repository.url);
    const isEmpty = remoteBranches.length === 0;

    if (isEmpty) {
      const bootstrapBranch = configuredBaseBranch || configuredDefaultBranch || 'main';

      log('warn', 'Runtime detected an empty remote repository and will bootstrap it.', {
        projectId: project.id,
        repositoryUrl: project.repository.url,
        bootstrapBranch,
      });

      return {
        project: {
          ...project,
          repository: {
            ...project.repository,
            defaultBranch: bootstrapBranch,
            baseBranch: bootstrapBranch,
          },
        },
        remoteBranches,
        isEmpty: true,
      };
    }

    const remoteDefaultBranch = await this.getRemoteDefaultBranch(project.repository.url);
    const inferredFallbackBranch =
      remoteDefaultBranch ??
      (remoteBranches.length === 1 ? (remoteBranches[0] ?? null) : null);

    const defaultBranch = await this.resolveRemoteBranch({
      repositoryUrl: project.repository.url,
      preferredBranch: configuredDefaultBranch,
      fallbackBranch: inferredFallbackBranch,
    });
    const baseBranch = await this.resolveRemoteBranch({
      repositoryUrl: project.repository.url,
      preferredBranch: configuredBaseBranch,
      fallbackBranch: defaultBranch,
    });

    if (
      defaultBranch !== configuredDefaultBranch ||
      baseBranch !== configuredBaseBranch
    ) {
      log('warn', 'Runtime resolved repository branches from remote metadata.', {
        projectId: project.id,
        repositoryUrl: project.repository.url,
        configuredDefaultBranch,
        configuredBaseBranch,
        resolvedDefaultBranch: defaultBranch,
        resolvedBaseBranch: baseBranch,
      });
    }

    return {
      project: {
        ...project,
        repository: {
          ...project.repository,
          defaultBranch,
          baseBranch,
        },
      },
      remoteBranches,
      isEmpty: false,
    };
  }

  private async bootstrapEmptyRemote(
    project: RepoRegistryProject,
    repositoryPath: string,
  ): Promise<void> {
    const bootstrapBranch = project.repository.baseBranch;

    try {
      await this.runGit(['ls-remote', '--heads', 'origin', bootstrapBranch], repositoryPath, {
        allowEmptyStdout: true,
      });
      const branchExists = await this.remoteBranchExists('origin', bootstrapBranch, repositoryPath);

      if (branchExists) {
        return;
      }
    } catch {
      // Continue with bootstrap when the repository has no refs yet.
    }

    await this.runGit(['checkout', '--orphan', bootstrapBranch], repositoryPath);
    await this.runGit(
      [
        '-c',
        'user.name=Evolvo Runtime',
        '-c',
        'user.email=runtime@evolvo.local',
        'commit',
        '--allow-empty',
        '-m',
        'Initialize repository for runtime automation',
      ],
      repositoryPath,
    );
    await this.runGit(['push', '-u', 'origin', bootstrapBranch], repositoryPath);

    log('info', 'Runtime bootstrapped an empty remote repository.', {
      projectId: project.id,
      repositoryPath,
      branch: bootstrapBranch,
    });
  }

  private async resolveRemoteBranch(input: {
    repositoryUrl: string;
    preferredBranch: string;
    fallbackBranch: string | null;
  }): Promise<string> {
    if (
      input.preferredBranch &&
      (await this.remoteBranchExists(input.repositoryUrl, input.preferredBranch))
    ) {
      return input.preferredBranch;
    }

    if (
      input.fallbackBranch &&
      (await this.remoteBranchExists(input.repositoryUrl, input.fallbackBranch))
    ) {
      return input.fallbackBranch;
    }

    throw new Error(
      `Remote branch ${input.preferredBranch} was not found for ${input.repositoryUrl}.`,
    );
  }

  private async remoteBranchExists(
    repositoryUrl: string,
    branchName: string,
    cwd?: string,
  ): Promise<boolean> {
    const result = await this.runGit(
      ['ls-remote', '--heads', repositoryUrl, branchName],
      cwd,
      {
        allowEmptyStdout: true,
      },
    );

    return Boolean(result.stdout.trim());
  }

  private async getRemoteDefaultBranch(
    repositoryUrl: string,
  ): Promise<string | null> {
    const result = await this.runGit(
      ['ls-remote', '--symref', repositoryUrl, 'HEAD'],
      undefined,
      {
        allowEmptyStdout: true,
      },
    );
    const match = result.stdout.match(/^ref:\s+refs\/heads\/(.+)\s+HEAD$/m);

    return match?.[1]?.trim() || null;
  }

  private async listRemoteBranches(repositoryUrl: string): Promise<string[]> {
    const result = await this.runGit(
      ['ls-remote', '--heads', repositoryUrl],
      undefined,
      {
        allowEmptyStdout: true,
      },
    );

    return result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.match(/refs\/heads\/(.+)$/)?.[1]?.trim() ?? null)
      .filter((branchName): branchName is string => Boolean(branchName));
  }
}