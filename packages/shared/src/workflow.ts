export const workflowStates = [
  'inbox',
  'planning',
  'readyForDev',
  'inDev',
  'readyForReview',
  'inReview',
  'readyForRelease',
  'requiresHumanIntervention',
  'released',
] as const;

export type WorkItemState = (typeof workflowStates)[number];

export interface KanbanBoardCard {
  id: string;
  epicId: string;
  epicTitle: string;
  parentId: string | null;
  kind: 'task' | 'subtask';
  title: string;
  description: string | null;
  state: WorkItemState;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dependencyIds: string[];
  acceptanceCriteriaCount: number;
  completedAcceptanceCriteriaCount: number;
  updatedAt: string;
}

export interface KanbanBoardColumn {
  state: WorkItemState;
  label: string;
  items: KanbanBoardCard[];
}

export interface KanbanBoardCounts {
  inbox: number;
  planning: number;
  readyForDev: number;
  inDev: number;
  readyForReview: number;
  inReview: number;
  readyForRelease: number;
  requiresHumanIntervention: number;
  released: number;
}

export interface KanbanBoardResponse {
  projectId: string;
  columns: KanbanBoardColumn[];
  counts: KanbanBoardCounts;
}

export interface TransitionWorkItemRequest {
  toState: WorkItemState;
  reason?: string;
  operatorOverride?: boolean;
}
