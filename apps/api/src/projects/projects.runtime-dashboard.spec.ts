import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectsService } from './projects.service.js';

describe('ProjectsService runtime dashboard', () => {
  const now = new Date('2026-03-10T08:30:00.000Z');

  let prisma: {
    project: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    workItemLease: {
      findMany: ReturnType<typeof vi.fn>;
    };
    structuredLogEntry: {
      findMany: ReturnType<typeof vi.fn>;
    };
    runtimeInstance: {
      findMany: ReturnType<typeof vi.fn>;
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
          .mockResolvedValueOnce([
            { runtimeId: 'runtime-1' },
            { runtimeId: 'runtime-1' },
          ])
          .mockResolvedValueOnce([
            { runtimeId: 'runtime-1' },
            { runtimeId: 'runtime-2' },
          ]),
      },
      structuredLogEntry: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'log-1',
            runtimeId: 'runtime-1',
            workItemId: 'work-1',
            message: 'Runtime command failed for acceptance criteria.',
            occurredAt: new Date('2026-03-10T08:25:00.000Z'),
          },
          {
            id: 'log-2',
            runtimeId: 'runtime-2',
            workItemId: 'work-2',
            message: 'Runtime lost access to release credentials.',
            occurredAt: new Date('2026-03-10T08:10:00.000Z'),
          },
        ]),
      },
      runtimeInstance: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'runtime-1',
            displayName: 'Builder 1',
            status: 'BUSY',
            capabilities: ['build', 'test'],
            activeJobSummary: 'Leased implement login',
            lastAction: 'Lease lease-1 granted for Implement login.',
            lastError: null,
            lastSeenAt: new Date('2026-03-10T08:29:30.000Z'),
            createdAt: new Date('2026-03-10T07:00:00.000Z'),
            updatedAt: new Date('2026-03-10T08:29:30.000Z'),
          },
          {
            id: 'runtime-2',
            displayName: 'Release Worker',
            status: 'DEGRADED',
            capabilities: ['release'],
            activeJobSummary: null,
            lastAction: 'Waiting for release work.',
            lastError: 'Missing credential.',
            lastSeenAt: new Date('2026-03-10T08:25:00.000Z'),
            createdAt: new Date('2026-03-10T07:15:00.000Z'),
            updatedAt: new Date('2026-03-10T08:25:00.000Z'),
          },
        ]),
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

  it('aggregates runtime health, active jobs, offline state, and recent failures', async () => {
    const result = await service.getRuntimeDashboard('project-1');

    expect(prisma.workItemLease.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.structuredLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'project-1',
          eventType: 'runtime.job.failed',
        }),
      }),
    );
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      runtimeId: 'runtime-1',
      connectionStatus: 'online',
      reportedStatus: 'busy',
      activeJobs: 2,
      heartbeatAgeSeconds: 30,
      recentFailures: [
        {
          id: 'log-1',
          workItemId: 'work-1',
        },
      ],
    });
    expect(result.items[1]).toMatchObject({
      runtimeId: 'runtime-2',
      connectionStatus: 'offline',
      reportedStatus: 'degraded',
      activeJobs: 0,
      recentFailures: [
        {
          id: 'log-2',
          workItemId: 'work-2',
        },
      ],
    });
  });
});