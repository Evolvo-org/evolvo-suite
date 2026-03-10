import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LogsService } from './logs.service.js';

describe('LogsService', () => {
  let prisma: {
    structuredLogEntry: {
      create: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    project: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let requestContextService: {
    getCorrelationId: ReturnType<typeof vi.fn>;
  };
  let service: LogsService;

  beforeEach(() => {
    prisma = {
      structuredLogEntry: {
        create: vi.fn().mockResolvedValue({
          id: 'log-1',
          level: 'INFO',
          source: 'runtime',
          projectId: 'project-1',
          workItemId: 'work-1',
          agentRunId: null,
          runtimeId: 'runtime-1',
          userId: null,
          agentType: null,
          eventType: 'runtime.job.failed',
          message: 'Runtime failed.',
          correlationId: 'corr-1',
          payload: { outcome: 'failed' },
          occurredAt: new Date('2026-03-10T09:10:00.000Z'),
          createdAt: new Date('2026-03-10T09:10:00.000Z'),
        }),
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'log-1',
            level: 'INFO',
            source: 'runtime',
            projectId: 'project-1',
            workItemId: 'work-1',
            agentRunId: null,
            runtimeId: 'runtime-1',
            userId: null,
            agentType: null,
            eventType: 'runtime.job.failed',
            message: 'Runtime failed.',
            correlationId: 'corr-1',
            payload: { outcome: 'failed' },
            occurredAt: new Date('2026-03-10T09:10:00.000Z'),
            createdAt: new Date('2026-03-10T09:10:00.000Z'),
          },
        ]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: 'project-1' }),
      },
    };
    requestContextService = {
      getCorrelationId: vi.fn().mockReturnValue('corr-1'),
    };

    service = new LogsService(prisma as never, requestContextService as never);
  });

  it('persists structured logs with the ambient correlation id', async () => {
    const record = await service.writeLog({
      source: 'runtime',
      projectId: 'project-1',
      workItemId: 'work-1',
      runtimeId: 'runtime-1',
      eventType: 'runtime.job.failed',
      message: 'Runtime failed.',
      payload: { outcome: 'failed' },
    });

    expect(prisma.structuredLogEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          correlationId: 'corr-1',
          eventType: 'runtime.job.failed',
        }),
      }),
    );
    expect(record.correlationId).toBe('corr-1');
  });

  it('lists project logs with normalized filters', async () => {
    const result = await service.getProjectLogs('project-1', {
      source: 'runtime',
      eventType: 'runtime.job.failed',
      limit: 10,
    });

    expect(prisma.structuredLogEntry.count).toHaveBeenCalled();
    expect(prisma.structuredLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'project-1',
          source: 'runtime',
          eventType: 'runtime.job.failed',
        }),
      }),
    );
    expect(result.totalCount).toBe(1);
  });
});