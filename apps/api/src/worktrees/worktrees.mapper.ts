import type { Worktree } from '@repo/db/client';
import type { WorktreeListResponse, WorktreeResponse } from '@repo/shared';

const mapStatus = (value: Worktree['status']): WorktreeResponse['status'] => {
  switch (value) {
    case 'ACTIVE':
      return 'active';
    case 'LOCKED_BY_DEV':
      return 'lockedByDev';
    case 'LOCKED_BY_REVIEW':
      return 'lockedByReview';
    case 'LOCKED_BY_RELEASE':
      return 'lockedByRelease';
    case 'STALE':
      return 'stale';
    case 'CLEANUP_PENDING':
      return 'cleanupPending';
    case 'ARCHIVED':
      return 'archived';
    case 'FAILED':
      return 'failed';
    default:
      return 'pending';
  }
};

export const mapWorktreeResponse = (worktree: Worktree): WorktreeResponse => ({
  id: worktree.id,
  projectId: worktree.projectId,
  workItemId: worktree.workItemId,
  runtimeId: worktree.runtimeId ?? null,
  leaseId: worktree.leaseId ?? null,
  status: mapStatus(worktree.status),
  path: worktree.path,
  branchName: worktree.branchName,
  baseBranch: worktree.baseBranch,
  headSha: worktree.headSha ?? null,
  pullRequestUrl: worktree.pullRequestUrl ?? null,
  isDirty: worktree.isDirty,
  details: worktree.details ?? null,
  lastSeenAt: worktree.lastSeenAt.toISOString(),
  cleanupRequestedAt: worktree.cleanupRequestedAt?.toISOString() ?? null,
  cleanupCompletedAt: worktree.cleanupCompletedAt?.toISOString() ?? null,
  createdAt: worktree.createdAt.toISOString(),
  updatedAt: worktree.updatedAt.toISOString(),
});

export const mapWorktreeListResponse = (
  projectId: string,
  worktrees: Worktree[],
): WorktreeListResponse => ({
  projectId,
  items: worktrees.map(mapWorktreeResponse),
});
