export const realtimeEventNames = [
  'project.planning.updated',
  'project.workflow.updated',
  'project.worktree.updated',
  'project.agent-run.updated',
  'project.review-gate.updated',
  'project.release.updated',
  'project.intervention.updated',
  'project.usage.updated',
] as const;
export type RealtimeEventName = (typeof realtimeEventNames)[number];

export interface ProjectRealtimeEvent {
  name: RealtimeEventName;
  projectId: string;
  entityId?: string;
  workItemId?: string;
  occurredAt: string;
  invalidationKeys: string[];
  payload?: Record<string, unknown>;
}

export const realtimeQueryInvalidationMap: Record<RealtimeEventName, string[]> = {
  'project.planning.updated': ['planning-hierarchy', 'work-item-detail'],
  'project.workflow.updated': ['board', 'board-counts', 'work-item-detail', 'work-item-audit'],
  'project.worktree.updated': ['worktrees'],
  'project.agent-run.updated': ['agent-runs'],
  'project.review-gate.updated': ['work-item-review-gates', 'work-item-review-gate-summary'],
  'project.release.updated': ['releases', 'work-item-detail'],
  'project.intervention.updated': ['interventions', 'work-item-detail'],
  'project.usage.updated': ['usage-summary'],
};
