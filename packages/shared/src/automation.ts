import type { KanbanBoardCounts } from './workflow';

export interface RunProjectAutomationRequest {
  maxActions?: number;
}

export interface AutomationActionRecord {
  lane: 'planning' | 'dev' | 'review' | 'release';
  workItemId: string | null;
  summary: string;
}

export interface RunProjectAutomationResponse {
  projectId: string;
  actions: AutomationActionRecord[];
  counts: KanbanBoardCounts;
}
