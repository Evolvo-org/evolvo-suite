import type { ResolvedAgentRouteResponse } from './agent-routing';
import type { AgentInputContract } from './agents';

export interface PlanningGeneratedTaskInput {
  title: string;
  description?: string;
  acceptanceCriteria: string[];
  ambiguityNotes?: string[];
}

export interface PlanningGeneratedResultInput {
  systemPrompt: string;
  userPrompt: string;
  accepted: boolean;
  decisionSummary: string;
  epicTitle?: string;
  epicSummary?: string;
  tasks: PlanningGeneratedTaskInput[];
}

export interface ExecutePlanningRequest {
  runtimeId?: string;
  leaseId?: string;
  generatedResult?: PlanningGeneratedResultInput;
}

export interface PlanningAgentTaskRecord {
  workItemId: string;
  title: string;
  state: 'planning' | 'readyForDev';
  acceptanceCriteriaCount: number;
}

export interface ExecutePlanningResponse {
  projectId: string;
  sourceWorkItemId: string;
  accepted: boolean;
  route: ResolvedAgentRouteResponse;
  input: AgentInputContract;
  runId: string;
  usageEventId: string | null;
  epicId: string | null;
  epicTitle: string | null;
  createdTaskIds: string[];
  promotedToReadyForDevIds: string[];
  comment: string;
  tasks: PlanningAgentTaskRecord[];
}
