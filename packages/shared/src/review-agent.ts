import type { ResolvedAgentRouteResponse } from './agent-routing';
import type { AgentInputContract } from './agents';
import type { ReviewGateResultRecord } from './review-gates';

export interface ExecuteReviewRequest {
  runtimeId?: string;
  leaseId?: string;
}

export interface ExecuteReviewResponse {
  projectId: string;
  workItemId: string;
  route: ResolvedAgentRouteResponse;
  input: AgentInputContract;
  runId: string;
  usageEventId: string;
  reviewGateResult: ReviewGateResultRecord;
  nextState: 'readyForDev' | 'readyForRelease' | 'requiresHumanIntervention';
  passed: boolean;
  comment: string;
}
