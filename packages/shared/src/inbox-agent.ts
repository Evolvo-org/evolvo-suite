import type { ResolvedAgentRouteResponse } from './agent-routing';
import type { AgentInputContract } from './agents';
import type { WorkItemPriority } from './planning-hierarchy';

export interface GenerateInboxIdeasRequest {
  maxIdeas?: number;
  runtimeId?: string;
}

export interface InboxIdeaCandidate {
  title: string;
  description: string;
  priority: WorkItemPriority;
  rationale: string;
  sourceSignals: string[];
}

export interface InboxContextSummary {
  projectName: string;
  repository: string;
  productSpecVersion: number | null;
  developmentPlanVersion: number | null;
  developmentPlanTitle: string | null;
  existingInboxCount: number;
  totalBacklogCount: number;
  sourceSignalCount: number;
  epicId: string;
  epicTitle: string;
}

export interface GeneratedInboxWorkItemRecord {
  workItemId: string;
  epicId: string;
  runId: string;
  usageEventId: string;
  title: string;
  priority: WorkItemPriority;
  state: 'inbox';
}

export interface GenerateInboxIdeasResponse {
  projectId: string;
  route: ResolvedAgentRouteResponse;
  context: InboxContextSummary;
  input: AgentInputContract;
  candidates: InboxIdeaCandidate[];
  items: GeneratedInboxWorkItemRecord[];
}
