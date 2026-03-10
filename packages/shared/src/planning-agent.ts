import type { ResolvedAgentRouteResponse } from './agent-routing';
import type { AgentInputContract } from './agents';

export interface TriageInboxIdeaRequest {
  runtimeId?: string;
}

export interface PlanningAgentTaskRecord {
  workItemId: string;
  title: string;
  state: 'planning' | 'readyForDev';
  acceptanceCriteriaCount: number;
}

export interface TriageInboxIdeaResponse {
  projectId: string;
  sourceWorkItemId: string;
  accepted: boolean;
  route: ResolvedAgentRouteResponse;
  input: AgentInputContract;
  runId: string;
  usageEventId: string;
  epicId: string | null;
  epicTitle: string | null;
  createdTaskIds: string[];
  promotedToReadyForDevIds: string[];
  comment: string;
  tasks: PlanningAgentTaskRecord[];
}
