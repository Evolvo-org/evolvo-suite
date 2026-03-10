export const worktreeStatuses = [
  'pending',
  'active',
  'lockedByDev',
  'lockedByReview',
  'lockedByRelease',
  'stale',
  'cleanupPending',
  'archived',
  'failed',
] as const;

export type WorktreeStatus = (typeof worktreeStatuses)[number];

export interface UpsertWorktreeRequest {
  workItemId: string;
  runtimeId?: string;
  leaseId?: string;
  status: WorktreeStatus;
  path: string;
  branchName: string;
  baseBranch: string;
  headSha?: string;
  pullRequestUrl?: string;
  isDirty?: boolean;
  details?: string;
}

export interface WorktreeResponse {
  id: string;
  projectId: string;
  workItemId: string;
  runtimeId: string | null;
  leaseId: string | null;
  status: WorktreeStatus;
  path: string;
  branchName: string;
  baseBranch: string;
  headSha: string | null;
  pullRequestUrl: string | null;
  isDirty: boolean;
  details: string | null;
  lastSeenAt: string;
  cleanupRequestedAt: string | null;
  cleanupCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorktreeListResponse {
  projectId: string;
  items: WorktreeResponse[];
}

export interface MarkWorktreeStaleRequest {
  reason?: string;
}

export interface RequestWorktreeCleanupRequest {
  reason?: string;
}
