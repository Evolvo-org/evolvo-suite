export const agentRunStatuses = [
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;

export type AgentRunStatus = (typeof agentRunStatuses)[number];

export const agentTypes = [
  'inbox',
  'planning',
  'dev',
  'review',
  'release',
] as const;

export type AgentType = (typeof agentTypes)[number];

export const agentFailureCategories = [
  'runtime',
  'model',
  'validation',
  'mergeConflict',
  'ambiguity',
  'policy',
] as const;

export type AgentFailureCategory = (typeof agentFailureCategories)[number];

export const agentContextKinds = [
  'productSpec',
  'developmentPlan',
  'epic',
  'workItem',
  'artifact',
  'comment',
] as const;

export type AgentContextKind = (typeof agentContextKinds)[number];

export const agentArtifactTypes = [
  'log',
  'patch',
  'report',
  'plan',
  'other',
] as const;

export type AgentArtifactType = (typeof agentArtifactTypes)[number];

export interface AgentContextReference {
  kind: AgentContextKind;
  id: string;
  title?: string;
}

export interface AgentInputContract {
  agentType: AgentType;
  projectId: string;
  workItemId?: string;
  runtimeId?: string;
  leaseId?: string;
  goal: string;
  instructions?: string;
  context: AgentContextReference[];
  metadata?: Record<string, string>;
}

export interface AgentFailureContract {
  category: AgentFailureCategory;
  message: string;
  retryable: boolean;
  details?: string;
}

export interface AgentUsageReportContract {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs?: number;
  estimatedCostUsd?: number;
}

export interface AgentResultContract {
  status: AgentRunStatus;
  summary: string;
  nextState?: import('./workflow').WorkItemState;
  decisionSummary?: string;
  artifactLabels?: string[];
  usage?: AgentUsageReportContract;
  failure?: AgentFailureContract;
}

export interface CreateAgentRunRequest {
  agentType: string;
  status?: AgentRunStatus;
  runtimeId?: string;
  leaseId?: string;
  startedAt?: string;
  completedAt?: string;
  summary?: string;
}

export interface CreateAgentDecisionRequest {
  decision: string;
  rationale?: string;
}

export interface CreateAgentFailureRequest {
  errorMessage: string;
  details?: string;
}

export interface UpsertPromptSnapshotRequest {
  systemPrompt?: string;
  userPrompt?: string;
  messagesJson?: string;
}

export interface CreateAgentArtifactRequest {
  artifactType: AgentArtifactType;
  label: string;
  content?: string;
  url?: string;
}

export interface AgentDecisionRecord {
  id: string;
  decision: string;
  rationale: string | null;
  createdAt: string;
}

export interface AgentFailureRecord {
  id: string;
  errorMessage: string;
  details: string | null;
  createdAt: string;
}

export interface PromptSnapshotRecord {
  id: string;
  systemPrompt: string | null;
  userPrompt: string | null;
  messagesJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentArtifactRecord {
  id: string;
  artifactType: AgentArtifactType;
  label: string;
  content: string | null;
  url: string | null;
  createdAt: string;
}

export interface AgentRunRecord {
  id: string;
  projectId: string;
  workItemId: string;
  runtimeId: string | null;
  leaseId: string | null;
  agentType: string;
  status: AgentRunStatus;
  startedAt: string;
  completedAt: string | null;
  summary: string | null;
  promptSnapshot: PromptSnapshotRecord | null;
  decisions: AgentDecisionRecord[];
  failure: AgentFailureRecord | null;
  artifacts: AgentArtifactRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunListResponse {
  projectId: string;
  workItemId: string;
  items: AgentRunRecord[];
}
