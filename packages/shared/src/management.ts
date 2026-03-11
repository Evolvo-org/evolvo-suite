import type { ProjectRepositoryInput } from './projects';

export const managementCommandTypes = ['repo.clone_or_sync'] as const;
export const managementCommandStatuses = [
  'pending',
  'inProgress',
  'completed',
  'failed',
] as const;

export type ManagementCommandType = (typeof managementCommandTypes)[number];
export type ManagementCommandStatus = (typeof managementCommandStatuses)[number];

export interface RepoCloneOrSyncCommandArgs {
  projectId: string;
  projectSlug: string;
  repository: ProjectRepositoryInput;
}

export interface RepoCloneOrSyncCommandResult {
  localPath: string;
  resolvedDefaultBranch: string;
  resolvedBaseBranch: string;
}

export interface ManagementCommandRecord {
  id: string;
  projectId: string;
  commandType: ManagementCommandType;
  status: ManagementCommandStatus;
  requestedBy: string | null;
  runtimeId: string | null;
  args: RepoCloneOrSyncCommandArgs;
  activeStage: string | null;
  statusSummary: string | null;
  result: RepoCloneOrSyncCommandResult | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ManagementCommandProgressRequest {
  activeStage?: string;
  statusSummary?: string;
}

export interface ManagementCommandCompleteRequest {
  statusSummary?: string;
  result?: RepoCloneOrSyncCommandResult;
}

export interface ManagementCommandFailRequest {
  errorMessage: string;
  statusSummary?: string;
}