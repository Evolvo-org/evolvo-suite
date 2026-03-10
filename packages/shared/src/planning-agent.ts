import type { ResolvedAgentRouteResponse } from './agent-routing';
import type { AgentInputContract } from './agents';

export interface PlanningGeneratedTaskInput {
  title: string;
  description?: string;
  acceptanceCriteria: string[];
  ambiguityNotes?: string[];
}

export interface PlanningGeneratedEpicInput {
  title: string;
  summary?: string;
  tasks: PlanningGeneratedTaskInput[];
}

export interface PlanningGeneratedResultInput {
  systemPrompt: string;
  userPrompt: string;
  accepted: boolean;
  decisionSummary: string;
  epics: PlanningGeneratedEpicInput[];
}

export interface ExecutePlanningRequest {
  runtimeId?: string;
  leaseId?: string;
  generatedResult?: PlanningGeneratedResultInput;
}

export interface PlanningAgentTaskRecord {
  workItemId: string;
  epicId: string;
  epicTitle: string;
  title: string;
  state: 'planning' | 'readyForDev';
  acceptanceCriteriaCount: number;
}

export interface PlanningAgentEpicRecord {
  epicId: string;
  title: string;
  taskIds: string[];
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
  epics: PlanningAgentEpicRecord[];
  createdTaskIds: string[];
  promotedToReadyForDevIds: string[];
  comment: string;
  tasks: PlanningAgentTaskRecord[];
}
