import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { log } from './logger';
import { LocalRepoRegistry } from './repo-registry';
import { RuntimeApiClient } from './runtime-api-client';
import { WorktreeManager } from './worktree-manager';

export interface RecoverySummary {
  detectedLocalWorktrees: number;
  reconciledProjects: number;
  resumedWorktrees: number;
  staleMarked: number;
}

const activeWorktreeStatuses = new Set([
  'active',
  'lockedByDev',
  'lockedByReview',
  'lockedByRelease',
]);

export class RecoveryService {
  public constructor(
    private readonly repositoriesRoot: string,
    private readonly localRepoRegistry: LocalRepoRegistry,
    private readonly runtimeApiClient: RuntimeApiClient,
    private readonly worktreeManager: WorktreeManager,
  ) {}

  public async reconcileOnStartup(): Promise<RecoverySummary> {
    const [registeredProjects, localWorktrees] = await Promise.all([
      this.localRepoRegistry.listProjects(),
      this.listLocalWorktrees(),
    ]);

    let resumedWorktrees = 0;
    let staleMarked = 0;

    for (const project of registeredProjects) {
      const worktrees = await this.runtimeApiClient.listProjectWorktrees(
        project.projectId,
      );

      for (const worktree of worktrees.items) {
        if (!activeWorktreeStatuses.has(worktree.status)) {
          continue;
        }

        const existsLocally = localWorktrees.has(worktree.path);
        const isStale =
          !existsLocally ||
          (await this.worktreeManager.isStale(project.localPath, worktree.path));

        if (isStale) {
          await this.runtimeApiClient.markWorktreeStale(
            project.projectId,
            worktree.id,
            'Runtime restart reconciliation marked the worktree stale because the local path could not be resumed safely.',
          );
          staleMarked += 1;
          continue;
        }

        resumedWorktrees += 1;
      }
    }

    const summary = {
      detectedLocalWorktrees: localWorktrees.size,
      reconciledProjects: registeredProjects.length,
      resumedWorktrees,
      staleMarked,
    };

    log('info', 'Runtime startup reconciliation completed.', summary);
    return summary;
  }

  private async listLocalWorktrees(): Promise<Set<string>> {
    const worktreesRoot = join(this.repositoriesRoot, 'worktrees');

    try {
      const entries = await readdir(worktreesRoot, { withFileTypes: true });
      return new Set(
        entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => join(worktreesRoot, entry.name)),
      );
    } catch {
      return new Set();
    }
  }
}