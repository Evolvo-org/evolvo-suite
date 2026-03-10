export const humanInterventionStatuses = ['open', 'resolved'] as const;
export type HumanInterventionStatus = (typeof humanInterventionStatuses)[number];

export const interventionRetryStates = ['planning', 'readyForDev'] as const;
export type InterventionRetryState = (typeof interventionRetryStates)[number];

export interface CreateHumanInterventionRequest {
  summary: string;
  reason: string;
  attemptsMade?: string;
  evidence?: string;
  suggestedAction?: string;
}

export interface ResolveHumanInterventionRequest {
  resolutionNotes?: string;
}

export interface RetryHumanInterventionRequest {
  toState: InterventionRetryState;
  resolutionNotes?: string;
}

export interface HumanInterventionCaseRecord {
  id: string;
  projectId: string;
  workItemId: string;
  workItemTitle: string;
  status: HumanInterventionStatus;
  summary: string;
  reason: string;
  attemptsMade: string | null;
  evidence: string | null;
  suggestedAction: string | null;
  resolutionNotes: string | null;
  retryCount: number;
  createdAt: string;
  resolvedAt: string | null;
  updatedAt: string;
}

export interface HumanInterventionListResponse {
  projectId: string;
  items: HumanInterventionCaseRecord[];
}
