import type { WorkItem } from '@repo/db/client';
import type {
  KanbanBoardCard,
  KanbanBoardCounts,
  KanbanBoardResponse,
  WorkItemState,
} from '@repo/shared';

const workflowLabelMap: Record<WorkItemState, string> = {
  inbox: 'Inbox',
  planning: 'Planning',
  readyForDev: 'Ready for dev',
  inDev: 'In dev',
  readyForReview: 'Ready for review',
  inReview: 'In review',
  readyForRelease: 'Ready for release',
  requiresHumanIntervention: 'Requires human intervention',
  released: 'Released',
};

const mapState = (value: WorkItem['state']): WorkItemState => {
  switch (value) {
    case 'PLANNING':
      return 'planning';
    case 'READY_FOR_DEV':
      return 'readyForDev';
    case 'IN_DEV':
      return 'inDev';
    case 'READY_FOR_REVIEW':
      return 'readyForReview';
    case 'IN_REVIEW':
      return 'inReview';
    case 'READY_FOR_RELEASE':
      return 'readyForRelease';
    case 'REQUIRES_HUMAN_INTERVENTION':
      return 'requiresHumanIntervention';
    case 'RELEASED':
      return 'released';
    case 'INBOX':
    default:
      return 'inbox';
  }
};

const mapPriority = (value: WorkItem['priority']): KanbanBoardCard['priority'] => {
  switch (value) {
    case 'LOW':
      return 'low';
    case 'HIGH':
      return 'high';
    case 'URGENT':
      return 'urgent';
    case 'MEDIUM':
    default:
      return 'medium';
  }
};

export const createEmptyBoardCounts = (): KanbanBoardCounts => ({
  inbox: 0,
  planning: 0,
  readyForDev: 0,
  inDev: 0,
  readyForReview: 0,
  inReview: 0,
  readyForRelease: 0,
  requiresHumanIntervention: 0,
  released: 0,
});

export const mapBoardCard = (
  item: WorkItem & {
    epic: { title: string };
    dependencies: Array<{ dependsOnWorkItemId: string }>;
    acceptanceCriteria: Array<{ isComplete: boolean }>;
  },
): KanbanBoardCard => ({
  id: item.id,
  epicId: item.epicId,
  epicTitle: item.epic.title,
  parentId: item.parentId,
  kind: item.kind === 'SUBTASK' ? 'subtask' : 'task',
  title: item.title,
  description: item.description,
  state: mapState(item.state),
  priority: mapPriority(item.priority),
  dependencyIds: item.dependencies.map((dependency) => dependency.dependsOnWorkItemId),
  acceptanceCriteriaCount: item.acceptanceCriteria.length,
  completedAcceptanceCriteriaCount: item.acceptanceCriteria.filter(
    (criterion) => criterion.isComplete,
  ).length,
  updatedAt: item.updatedAt.toISOString(),
});

export const mapBoardResponse = (
  projectId: string,
  cards: KanbanBoardCard[],
): KanbanBoardResponse => {
  const counts = createEmptyBoardCounts();

  for (const card of cards) {
    counts[card.state] += 1;
  }

  return {
    projectId,
    columns: Object.entries(workflowLabelMap).map(([state, label]) => ({
      state: state as WorkItemState,
      label,
      items: cards.filter((card) => card.state === state),
    })),
    counts,
  };
};
