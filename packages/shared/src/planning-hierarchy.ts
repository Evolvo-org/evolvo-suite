export type WorkItemKind = 'task' | 'subtask';

export type WorkItemPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface AcceptanceCriterionItem {
  id: string;
  text: string;
  isComplete: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkItemNode {
  id: string;
  epicId: string;
  parentId: string | null;
  kind: WorkItemKind;
  title: string;
  description: string | null;
  priority: WorkItemPriority;
  sortOrder: number;
  dependencyIds: string[];
  acceptanceCriteria: AcceptanceCriterionItem[];
  children: WorkItemNode[];
  createdAt: string;
  updatedAt: string;
}

export interface EpicNode {
  id: string;
  projectId: string;
  developmentPlanId: string | null;
  title: string;
  summary: string | null;
  sortOrder: number;
  tasks: WorkItemNode[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanningHierarchyResponse {
  projectId: string;
  developmentPlanId: string | null;
  epics: EpicNode[];
  workItemCount: number;
  acceptanceCriteriaCount: number;
}

export interface CreateEpicRequest {
  title: string;
  summary?: string;
  sortOrder?: number;
}

export interface UpdateEpicRequest {
  title?: string;
  summary?: string | null;
  sortOrder?: number;
}

export interface CreateWorkItemRequest {
  epicId: string;
  parentId?: string;
  kind: WorkItemKind;
  title: string;
  description?: string;
  priority?: WorkItemPriority;
  sortOrder?: number;
}

export interface UpdateWorkItemRequest {
  epicId?: string;
  parentId?: string | null;
  title?: string;
  description?: string | null;
  priority?: WorkItemPriority;
  sortOrder?: number;
}

export interface UpdateWorkItemPriorityRequest {
  priority: WorkItemPriority;
}

export interface UpdateWorkItemDependenciesRequest {
  dependencyIds: string[];
}

export interface CreateAcceptanceCriterionRequest {
  text: string;
  isComplete?: boolean;
  sortOrder?: number;
}

export interface UpdateAcceptanceCriterionRequest {
  text?: string;
  isComplete?: boolean;
  sortOrder?: number;
}
