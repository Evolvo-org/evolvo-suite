import type {
  ReleaseNote,
  ReleaseRun,
  ReleaseVersion,
  WorkItem,
} from '@repo/db/client';
import type {
  ReleaseHistoryResponse,
  ReleaseNoteFormat,
  ReleaseRunRecord,
  ReleaseRunStatus,
} from '@repo/shared';

const mapReleaseStatus = (value: ReleaseRun['status']): ReleaseRunStatus => {
  switch (value) {
    case 'SUCCEEDED':
      return 'succeeded';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'running';
  }
};

const mapReleaseNoteFormat = (value: ReleaseNote['format']): ReleaseNoteFormat => {
  switch (value) {
    case 'PLAIN_TEXT':
      return 'plainText';
    default:
      return 'markdown';
  }
};

export const mapReleaseRun = (
  releaseRun: ReleaseRun & {
    workItem: Pick<WorkItem, 'title'>;
    version: ReleaseVersion | null;
    note: ReleaseNote | null;
  },
): ReleaseRunRecord => ({
  id: releaseRun.id,
  projectId: releaseRun.projectId,
  workItemId: releaseRun.workItemId,
  workItemTitle: releaseRun.workItem.title,
  runtimeId: releaseRun.runtimeId,
  leaseId: releaseRun.leaseId,
  worktreeId: releaseRun.worktreeId,
  status: mapReleaseStatus(releaseRun.status),
  summary: releaseRun.summary,
  errorMessage: releaseRun.errorMessage,
  mergeCommitSha: releaseRun.mergeCommitSha,
  releaseUrl: releaseRun.releaseUrl,
  startedAt: releaseRun.startedAt.toISOString(),
  completedAt: releaseRun.completedAt?.toISOString() ?? null,
  version: releaseRun.version
    ? {
        id: releaseRun.version.id,
        version: releaseRun.version.version,
        tagName: releaseRun.version.tagName,
        targetBranch: releaseRun.version.targetBranch,
        commitSha: releaseRun.version.commitSha,
        createdAt: releaseRun.version.createdAt.toISOString(),
        updatedAt: releaseRun.version.updatedAt.toISOString(),
      }
    : null,
  note: releaseRun.note
    ? {
        id: releaseRun.note.id,
        title: releaseRun.note.title,
        content: releaseRun.note.content,
        format: mapReleaseNoteFormat(releaseRun.note.format),
        createdAt: releaseRun.note.createdAt.toISOString(),
        updatedAt: releaseRun.note.updatedAt.toISOString(),
      }
    : null,
  createdAt: releaseRun.createdAt.toISOString(),
  updatedAt: releaseRun.updatedAt.toISOString(),
});

export const mapReleaseHistory = (
  projectId: string,
  items: Array<
    ReleaseRun & {
      workItem: Pick<WorkItem, 'title'>;
      version: ReleaseVersion | null;
      note: ReleaseNote | null;
    }
  >,
): ReleaseHistoryResponse => ({
  projectId,
  items: items.map(mapReleaseRun),
});
