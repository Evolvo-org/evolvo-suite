import type { ManagementCommand } from '@repo/db/client';
import type {
  ManagementCommandRecord,
  ManagementCommandStatus,
  ManagementCommandType,
  RepoCloneOrSyncCommandArgs,
  RepoCloneOrSyncCommandResult,
} from '@repo/shared';

const mapCommandType = (
  value: ManagementCommand['commandType'],
): ManagementCommandType => {
  switch (value) {
    case 'REPO_CLONE_OR_SYNC':
      return 'repo.clone_or_sync';
  }
};

const mapCommandStatus = (
  value: ManagementCommand['status'],
): ManagementCommandStatus => {
  switch (value) {
    case 'IN_PROGRESS':
      return 'inProgress';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    default:
      return 'pending';
  }
};

export const mapManagementCommand = (
  command: ManagementCommand,
): ManagementCommandRecord => ({
  id: command.id,
  projectId: command.projectId,
  commandType: mapCommandType(command.commandType),
  status: mapCommandStatus(command.status),
  requestedBy: command.requestedBy ?? null,
  runtimeId: command.runtimeId ?? null,
  args: command.argsJson as unknown as RepoCloneOrSyncCommandArgs,
  activeStage: command.activeStage ?? null,
  statusSummary: command.statusSummary ?? null,
  result:
    (command.resultJson as unknown as RepoCloneOrSyncCommandResult | null) ?? null,
  errorMessage: command.errorMessage ?? null,
  createdAt: command.createdAt.toISOString(),
  updatedAt: command.updatedAt.toISOString(),
  startedAt: command.startedAt?.toISOString() ?? null,
  completedAt: command.completedAt?.toISOString() ?? null,
});