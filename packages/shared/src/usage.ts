export interface CreateUsageEventRequest {
  workItemId?: string;
  agentRunId?: string;
  runtimeId?: string;
  userId?: string;
  agentType: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  occurredAt?: string;
}

export interface UsageEventRecord {
  id: string;
  projectId: string;
  workItemId: string | null;
  agentRunId: string | null;
  runtimeId: string | null;
  userId: string | null;
  agentType: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  occurredAt: string;
  createdAt: string;
}

export interface UsageBreakdownItem {
  key: string;
  totalEvents: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface UsageSummaryResponse {
  projectId?: string;
  userId?: string;
  from: string | null;
  to: string | null;
  totalEvents: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  byAgent: UsageBreakdownItem[];
  byProviderModel: UsageBreakdownItem[];
}
