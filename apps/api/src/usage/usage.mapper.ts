import type { UsageEvent } from '@repo/db/client';
import type {
  UsageBreakdownItem,
  UsageEventRecord,
  UsageSummaryResponse,
} from '@repo/shared';

const toNumber = (value: number | bigint | string | { toString(): string }): number =>
  typeof value === 'number' ? value : Number(value.toString());

export const mapUsageEvent = (item: UsageEvent): UsageEventRecord => ({
  id: item.id,
  projectId: item.projectId,
  workItemId: item.workItemId,
  agentRunId: item.agentRunId,
  runtimeId: item.runtimeId,
  userId: item.userId,
  agentType: item.agentType,
  provider: item.provider,
  model: item.model,
  inputTokens: item.inputTokens,
  outputTokens: item.outputTokens,
  totalTokens: item.totalTokens,
  estimatedCostUsd: toNumber(item.estimatedCostUsd),
  occurredAt: item.occurredAt.toISOString(),
  createdAt: item.createdAt.toISOString(),
});

export const createBreakdown = (
  entries: Map<string, {
    totalEvents: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }>,
): UsageBreakdownItem[] =>
  [...entries.entries()]
    .map(([key, value]) => ({
      key,
      ...value,
    }))
    .sort((left, right) => right.totalTokens - left.totalTokens || left.key.localeCompare(right.key));

export const mapUsageSummary = (params: {
  projectId?: string;
  userId?: string;
  from: Date | null;
  to: Date | null;
  totalEvents: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  byAgent: Map<string, {
    totalEvents: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }>;
  byProviderModel: Map<string, {
    totalEvents: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }>;
}): UsageSummaryResponse => ({
  projectId: params.projectId,
  userId: params.userId,
  from: params.from?.toISOString() ?? null,
  to: params.to?.toISOString() ?? null,
  totalEvents: params.totalEvents,
  inputTokens: params.inputTokens,
  outputTokens: params.outputTokens,
  totalTokens: params.totalTokens,
  estimatedCostUsd: params.estimatedCostUsd,
  byAgent: createBreakdown(params.byAgent),
  byProviderModel: createBreakdown(params.byProviderModel),
});
