import type { HumanInterventionCase, WorkItem } from '@repo/db/client';
import type {
  HumanInterventionCaseRecord,
  HumanInterventionListResponse,
  HumanInterventionStatus,
} from '@repo/shared';

const mapStatus = (
  value: HumanInterventionCase['status'],
): HumanInterventionStatus => {
  switch (value) {
    case 'RESOLVED':
      return 'resolved';
    default:
      return 'open';
  }
};

export const mapInterventionCase = (
  item: HumanInterventionCase & { workItem: Pick<WorkItem, 'title'> },
): HumanInterventionCaseRecord => ({
  id: item.id,
  projectId: item.projectId,
  workItemId: item.workItemId,
  workItemTitle: item.workItem.title,
  status: mapStatus(item.status),
  summary: item.summary,
  reason: item.reason,
  attemptsMade: item.attemptsMade,
  evidence: item.evidence,
  suggestedAction: item.suggestedAction,
  resolutionNotes: item.resolutionNotes,
  retryCount: item.retryCount,
  createdAt: item.createdAt.toISOString(),
  resolvedAt: item.resolvedAt?.toISOString() ?? null,
  updatedAt: item.updatedAt.toISOString(),
});

export const mapInterventionList = (
  projectId: string,
  items: Array<HumanInterventionCase & { workItem: Pick<WorkItem, 'title'> }>,
): HumanInterventionListResponse => ({
  projectId,
  items: items.map(mapInterventionCase),
});
