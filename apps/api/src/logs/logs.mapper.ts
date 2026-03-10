import type { StructuredLogListResponse, StructuredLogRecord } from '@repo/shared';

const fromPrismaLevel = (value: string): StructuredLogRecord['level'] => {
  switch (value) {
    case 'DEBUG':
      return 'debug';
    case 'WARN':
      return 'warn';
    case 'ERROR':
      return 'error';
    default:
      return 'info';
  }
};

export const mapStructuredLog = (item: {
  id: string;
  level: string;
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
  occurredAt: Date;
  createdAt: Date;
}): StructuredLogRecord => ({
  id: item.id,
  level: fromPrismaLevel(item.level),
  source: item.source,
  projectId: item.projectId,
  workItemId: item.workItemId,
  agentRunId: item.agentRunId,
  runtimeId: item.runtimeId,
  userId: item.userId,
  agentType: item.agentType,
  eventType: item.eventType,
  message: item.message,
  correlationId: item.correlationId,
  payload: item.payload,
  occurredAt: item.occurredAt.toISOString(),
  createdAt: item.createdAt.toISOString(),
});

export const mapStructuredLogList = (value: StructuredLogListResponse) => value;