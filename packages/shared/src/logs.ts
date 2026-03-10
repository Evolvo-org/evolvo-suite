export const structuredLogLevels = ['debug', 'info', 'warn', 'error'] as const;
export type StructuredLogLevel = (typeof structuredLogLevels)[number];

export interface StructuredLogQuery {
  level?: StructuredLogLevel;
  source?: string;
  eventType?: string;
  correlationId?: string;
  workItemId?: string;
  agentRunId?: string;
  runtimeId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface StructuredLogRecord {
  id: string;
  level: StructuredLogLevel;
  source: string;
  projectId: string | null;
  workItemId: string | null;
  agentRunId: string | null;
  runtimeId: string | null;
  userId: string | null;
  agentType: string | null;
  eventType: string;
  message: string | null;
  correlationId: string | null;
  payload: unknown | null;
  occurredAt: string;
  createdAt: string;
}

export interface StructuredLogListResponse {
  projectId: string | null;
  totalCount: number;
  items: StructuredLogRecord[];
  filters: StructuredLogQuery;
}