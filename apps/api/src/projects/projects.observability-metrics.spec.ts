import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectsService } from './projects.service.js';

describe('ProjectsService observability metrics', () => {
  const now = new Date('2026-03-10T09:00:00.000Z');

  let prisma: {
    project: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    workItemLease: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    structuredLogEntry: {
      findMany: ReturnType<typeof vi.fn>;
    };
    runtimeInstance: {
      findMany: ReturnType<typeof vi.fn>;
    };
    workItemRetryState: {
      findMany: ReturnType<typeof vi.fn>;
    };
    releaseRun: {
      count: ReturnType<typeof vi.fn>;
    };
    usageEvent: {
      aggregate: ReturnType<typeof vi.fn>;
    };
  };
  let service: ProjectsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: 'project-1' }),
      },
      workItemLease: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ runtimeId: 'runtime-1' }])
          .mockResolvedValueOnce([{ runtimeId: 'runtime-1' }]),
        count: vi.fn().mockResolvedValue(2),
      },
      structuredLogEntry: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      runtimeInstance: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'runtime-1',
            displayName: 'Runtime 1',
            status: 'IDLE',
            capabilities: ['dev'],
            activeJobSummary: null,
            lastAction: 'Waiting for work.',
            lastError: null,
            lastSeenAt: new Date('2026-03-10T08:57:00.000Z'),
            createdAt: new Date('2026-03-10T07:00:00.000Z'),
            updatedAt: new Date('2026-03-10T08:57:00.000Z'),
          },
        ]),
      },
      workItemRetryState: {
        findMany: vi.fn().mockResolvedValue([
          { reviewFailureCount: 2 },
          { reviewFailureCount: 3 },
        ]),
      },
      releaseRun: {
        count: vi.fn().mockResolvedValue(1),
      },
      usageEvent: {
        aggregate: vi
          .fn()
          .mockResolvedValueOnce({ _sum: { totalTokens: 3000 } })
          .mockResolvedValueOnce({ _sum: { totalTokens: 1000 } }),
      },
    };

    service = new ProjectsService(
      prisma as never,
      {
        getResolvedSystemQueueLimits: vi.fn(),
        getResolvedSystemAgentRouting: vi.fn(),
      } as never,
      { writeLog: vi.fn() } as never,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives alerting metrics from runtime, lease, retry, release, and usage data', async () => {
    const result = await service.getObservabilityMetrics('project-1');

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'runtimeOffline',
          value: 1,
          status: 'warning',
        }),
        expect.objectContaining({
          name: 'failedLease',
          value: 2,
          status: 'warning',
        }),
        expect.objectContaining({
          name: 'repeatedReviewFailure',
          value: 5,
          status: 'warning',
        }),
        expect.objectContaining({
          name: 'releaseFailure',
          value: 1,
          status: 'warning',
        }),
        expect.objectContaining({
          name: 'usageSpike',
          value: 3000,
          threshold: 2000,
          status: 'warning',
        }),
      ]),
    );
  });
});