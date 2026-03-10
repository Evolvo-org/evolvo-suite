import type { ResolvedAgentRouteResponse } from './agent-routing';
import type { AgentInputContract } from './agents';
import type { ReleaseRunRecord } from './releases';

export const releaseAgentOutcomes = ['success', 'mergeConflict'] as const;
export type ReleaseAgentOutcome = (typeof releaseAgentOutcomes)[number];

export interface ExecuteReleaseRequest {
  runtimeId?: string;
  leaseId?: string;
  outcome?: ReleaseAgentOutcome;
}

export interface ExecuteReleaseResponse {
  projectId: string;
  workItemId: string;
  route: ResolvedAgentRouteResponse;
  input: AgentInputContract;
  runId: string;
  usageEventId: string;
  releaseRun: ReleaseRunRecord;
  interventionId: string | null;
  nextState: 'readyForRelease' | 'released' | 'requiresHumanIntervention';
  comment: string;
}
