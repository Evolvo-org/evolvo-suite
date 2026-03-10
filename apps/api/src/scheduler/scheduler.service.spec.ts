import { ConflictException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SchedulerService } from './scheduler.service.js';

describe('SchedulerService', () => {
  const now = new Date('2026-03-09T12:00:00.000Z');

  let prisma: {
    humanInterventionCase: {
      groupBy: ReturnType<typeof vi.fn>;
    };
    project: {
      findMany: ReturnType<typeof vi.fn>;
    };
    schedulerLaneCursor: {
      findMany: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
    workItemLease: {
      findMany: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
    };
    workItem: {
      findMany: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    workItemStateTransition: {
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let logsService: {
    writeLog: ReturnType<typeof vi.fn>;
  };
  let service: SchedulerService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    prisma = {
      humanInterventionCase: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
      project: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      schedulerLaneCursor: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockImplementation(({ create, update }: { create: { lane: string; lastProjectId: string | null }; update: { lastProjectId: string | null } }) => {
          return {
            lane: create.lane,
            lastProjectId: update.lastProjectId,
          };
        }),
      },
      workItemLease: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      workItem: {
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue(undefined),
      },
      workItemStateTransition: {
        create: vi.fn().mockResolvedValue(undefined),
      },
      $transaction: vi.fn(),
    };
    logsService = {
      writeLog: vi.fn().mockResolvedValue(undefined),
    };

    service = new SchedulerService(
      prisma as never,
      logsService as never,
      { ensureProjectExists: vi.fn() } as never,
      {
        getResolvedSystemQueueLimits: vi.fn().mockResolvedValue({
          maxPlanning: 10,
          maxReadyForDev: 12,
          maxInDev: 3,
          maxReadyForReview: 3,
          maxInReview: 2,
          maxReadyForRelease: 2,
          maxReviewRetries: 3,
          maxMergeConflictRetries: 2,
          maxRuntimeRetries: 3,
          maxAmbiguityRetries: 2,
        }),
      } as never,
      { assertTransition: vi.fn() } as never,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renews an active lease for the owning runtime', async () => {
    prisma.workItemLease.findUnique.mockResolvedValue({
      id: 'lease-1',
      projectId: 'project-1',
      workItemId: 'work-1',
      runtimeId: 'runtime-1',
      lane: 'DEV',
      status: 'ACTIVE',
      leaseToken: 'token-123',
      leasedAt: new Date('2026-03-09T11:55:00.000Z'),
      expiresAt: new Date('2026-03-09T12:10:00.000Z'),
      renewedAt: null,
      releasedAt: null,
      recoveredAt: null,
      recoveryReason: null,
      workItem: {
        title: 'Implement scheduler renewal',
        state: 'IN_DEV',
      },
    });
    prisma.workItemLease.update.mockResolvedValue({
      id: 'lease-1',
      projectId: 'project-1',
      workItemId: 'work-1',
      runtimeId: 'runtime-1',
      lane: 'DEV',
      status: 'ACTIVE',
      leaseToken: 'token-123',
      leasedAt: new Date('2026-03-09T11:55:00.000Z'),
      expiresAt: new Date('2026-03-09T12:20:00.000Z'),
      renewedAt: now,
      releasedAt: null,
      recoveredAt: null,
      recoveryReason: null,
      workItem: {
        title: 'Implement scheduler renewal',
        state: 'IN_DEV',
      },
    });

    const result = await service.renewLease('lease-1', {
      runtimeId: 'runtime-1',
      leaseToken: 'token-123',
      leaseDurationSeconds: 1_200,
    });

    expect(result.id).toBe('lease-1');
    expect(result.status).toBe('active');
    expect(result.renewedAt).toBe(now.toISOString());
    expect(prisma.workItemLease.update).toHaveBeenCalledOnce();
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'scheduler.lease.renewed',
        projectId: 'project-1',
        workItemId: 'work-1',
      }),
    );
  });

  it('rejects lease renewal when the token does not match', async () => {
    prisma.workItemLease.findUnique.mockResolvedValue({
      id: 'lease-1',
      projectId: 'project-1',
      workItemId: 'work-1',
      runtimeId: 'runtime-1',
      lane: 'DEV',
      status: 'ACTIVE',
      leaseToken: 'token-123',
      leasedAt: new Date('2026-03-09T11:55:00.000Z'),
      expiresAt: new Date('2026-03-09T12:10:00.000Z'),
      renewedAt: null,
      releasedAt: null,
      recoveredAt: null,
      recoveryReason: null,
      workItem: {
        title: 'Implement scheduler renewal',
        state: 'IN_DEV',
      },
    });

    await expect(
      service.renewLease('lease-1', {
        runtimeId: 'runtime-1',
        leaseToken: 'wrong-token',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.workItemLease.update).not.toHaveBeenCalled();
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'scheduler.lease.renew.failed',
        level: 'warn',
      }),
    );
  });

  it('recovers expired dev leases back to the ready queue', async () => {
    prisma.workItemLease.findMany
      .mockResolvedValueOnce([{ id: 'lease-1' }])
      .mockResolvedValueOnce([
        {
          id: 'lease-1',
          projectId: 'project-1',
          workItemId: 'work-1',
          runtimeId: 'runtime-1',
          lane: 'DEV',
          status: 'EXPIRED',
          leaseToken: 'token-123',
          leasedAt: new Date('2026-03-09T11:40:00.000Z'),
          expiresAt: new Date('2026-03-09T11:59:00.000Z'),
          renewedAt: null,
          releasedAt: null,
          recoveredAt: null,
          recoveryReason: null,
          workItem: {
            title: 'Recovered task',
            state: 'IN_DEV',
          },
        },
      ]);
    prisma.workItemLease.updateMany.mockResolvedValue({ count: 1 });
    prisma.workItemLease.update.mockResolvedValue({
      id: 'lease-1',
      projectId: 'project-1',
      workItemId: 'work-1',
      runtimeId: 'runtime-1',
      lane: 'DEV',
      status: 'RECOVERED',
      leaseToken: 'token-123',
      leasedAt: new Date('2026-03-09T11:40:00.000Z'),
      expiresAt: new Date('2026-03-09T11:59:00.000Z'),
      renewedAt: null,
      releasedAt: null,
      recoveredAt: now,
      recoveryReason:
        'Lease expired before the runtime renewed it. Recovery is required before the work item can be leased again.',
      workItem: {
        title: 'Recovered task',
        state: 'READY_FOR_DEV',
      },
    });
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof prisma) => unknown) => {
      return callback(prisma);
    });

    const result = await service.recoverExpiredLeases({ limit: 10 });

    expect(result.recoveredCount).toBe(1);
    expect(result.items[0]?.status).toBe('recovered');
    expect(prisma.workItem.update).toHaveBeenCalledWith({
      where: { id: 'work-1' },
      data: {
        state: 'READY_FOR_DEV',
        stateUpdatedAt: now,
      },
    });
    expect(prisma.workItemStateTransition.create).toHaveBeenCalledOnce();
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'scheduler.transition.attempt',
        workItemId: 'work-1',
      }),
    );
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'scheduler.lease.recovered',
        projectId: 'project-1',
        workItemId: 'work-1',
      }),
    );
  });

  it('does not lease dev work when the project is already at the in-dev cap', async () => {
    prisma.workItem.findMany.mockResolvedValue([
      {
        id: 'work-1',
        projectId: 'project-1',
        title: 'Capped task',
        state: 'READY_FOR_DEV',
        priority: 'HIGH',
        sortOrder: 1,
        stateUpdatedAt: new Date('2026-03-09T11:30:00.000Z'),
      },
    ]);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'project-1',
        name: 'Project One',
        lifecycleStatus: 'ACTIVE',
        queueLimits: {
          maxInDev: 1,
          maxInReview: 2,
          maxReadyForRelease: 2,
        },
      },
    ]);
    prisma.workItem.groupBy.mockResolvedValue([
      {
        projectId: 'project-1',
        state: 'IN_DEV',
        _count: { _all: 1 },
      },
    ]);
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof prisma) => unknown) => {
      return callback(prisma);
    });

    const result = await service.acquireLease({
      runtimeId: 'runtime-1',
      lanes: ['dev'],
    });

    expect(result.lease).toBeNull();
    expect(prisma.workItemLease.create).not.toHaveBeenCalled();
  });

  it('does not lease planning work when the project lacks active planning context', async () => {
    prisma.workItem.findMany.mockResolvedValue([
      {
        id: 'work-0',
        projectId: 'project-1',
        title: 'Planning request',
        state: 'PLANNING',
        priority: 'HIGH',
        sortOrder: 1,
        stateUpdatedAt: new Date('2026-03-09T11:30:00.000Z'),
      },
    ]);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'project-1',
        name: 'Project One',
        lifecycleStatus: 'ACTIVE',
        productSpec: null,
        developmentPlan: null,
        queueLimits: {
          maxPlanning: 1,
          maxInDev: 1,
          maxInReview: 1,
          maxReadyForRelease: 1,
        },
      },
    ]);
    prisma.workItem.groupBy.mockResolvedValue([]);
    prisma.workItemLease.groupBy.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof prisma) => unknown) => {
      return callback(prisma);
    });

    const result = await service.acquireLease({
      runtimeId: 'runtime-1',
      lanes: ['planning'],
    });

    expect(result.lease).toBeNull();
    expect(prisma.workItemLease.create).not.toHaveBeenCalled();
  });

  it('leases planning work on the planning lane without moving it into an execution state', async () => {
    prisma.workItem.findMany.mockResolvedValue([
      {
        id: 'work-0',
        projectId: 'project-1',
        title: 'Plan queue dashboard',
        state: 'PLANNING',
        priority: 'HIGH',
        sortOrder: 0,
        stateUpdatedAt: new Date('2026-03-09T11:30:00.000Z'),
      },
    ]);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'project-1',
        productSpec: {
          id: 'spec-1',
        },
        developmentPlan: {
          id: 'plan-1',
          activeVersion: {
            id: 'plan-1-v1',
          },
        },
        queueLimits: {
          maxPlanning: 1,
          maxInDev: 3,
          maxInReview: 2,
          maxReadyForRelease: 2,
        },
      },
    ]);
    prisma.workItemLease.findFirst.mockResolvedValue(null);
    prisma.workItemLease.create.mockResolvedValue({
      id: 'lease-0',
      projectId: 'project-1',
      workItemId: 'work-0',
      runtimeId: 'runtime-1',
      lane: 'PLANNING',
      status: 'ACTIVE',
      leaseToken: 'token-0',
      leasedAt: now,
      expiresAt: new Date('2026-03-09T12:10:00.000Z'),
      renewedAt: null,
      releasedAt: null,
      recoveredAt: null,
      recoveryReason: null,
      workItem: {
        title: 'Plan queue dashboard',
        state: 'PLANNING',
      },
    });
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof prisma) => unknown) => {
      return callback(prisma);
    });

    const result = await service.acquireLease({
      runtimeId: 'runtime-1',
      lanes: ['planning'],
    });

    expect(result.lease?.lane).toBe('planning');
    expect(prisma.workItem.update).not.toHaveBeenCalled();
  });

  it('filters blocked items by requiring released dependencies', async () => {
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof prisma) => unknown) => {
      return callback(prisma);
    });

    await service.acquireLease({
      runtimeId: 'runtime-1',
      lanes: ['dev'],
    });

    expect(prisma.workItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dependencies: {
            none: {
              dependsOnWorkItem: {
                state: {
                  not: 'RELEASED',
                },
              },
            },
          },
        }),
      }),
    );
  });

  it('filters paused projects from scheduler candidates', async () => {
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof prisma) => unknown) => {
      return callback(prisma);
    });

    await service.acquireLease({
      runtimeId: 'runtime-1',
      lanes: ['review'],
    });

    expect(prisma.workItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          project: {
            lifecycleStatus: 'ACTIVE',
          },
        }),
      }),
    );
  });

  it('rotates the selected project across acquisitions for the same lane', async () => {
    prisma.workItem.findMany.mockResolvedValue([
      {
        id: 'work-1',
        projectId: 'project-a',
        title: 'First project task',
        state: 'READY_FOR_DEV',
        priority: 'HIGH',
        sortOrder: 1,
        stateUpdatedAt: new Date('2026-03-09T11:10:00.000Z'),
      },
      {
        id: 'work-2',
        projectId: 'project-b',
        title: 'Second project task',
        state: 'READY_FOR_DEV',
        priority: 'HIGH',
        sortOrder: 1,
        stateUpdatedAt: new Date('2026-03-09T11:15:00.000Z'),
      },
    ]);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'project-a',
        queueLimits: {
          maxInDev: 3,
          maxInReview: 2,
          maxReadyForRelease: 2,
        },
      },
      {
        id: 'project-b',
        queueLimits: {
          maxInDev: 3,
          maxInReview: 2,
          maxReadyForRelease: 2,
        },
      },
    ]);
    prisma.workItemLease.findFirst.mockResolvedValue(null);
    prisma.workItemLease.create
      .mockResolvedValueOnce({
        id: 'lease-1',
        projectId: 'project-a',
        workItemId: 'work-1',
        runtimeId: 'runtime-1',
        lane: 'DEV',
        status: 'ACTIVE',
        leaseToken: 'token-1',
        leasedAt: now,
        expiresAt: new Date('2026-03-09T12:10:00.000Z'),
        renewedAt: null,
        releasedAt: null,
        recoveredAt: null,
        recoveryReason: null,
        workItem: {
          title: 'First project task',
          state: 'READY_FOR_DEV',
        },
      })
      .mockResolvedValueOnce({
        id: 'lease-2',
        projectId: 'project-b',
        workItemId: 'work-2',
        runtimeId: 'runtime-1',
        lane: 'DEV',
        status: 'ACTIVE',
        leaseToken: 'token-2',
        leasedAt: now,
        expiresAt: new Date('2026-03-09T12:10:00.000Z'),
        renewedAt: null,
        releasedAt: null,
        recoveredAt: null,
        recoveryReason: null,
        workItem: {
          title: 'Second project task',
          state: 'READY_FOR_DEV',
        },
      });
    prisma.schedulerLaneCursor.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          lane: 'DEV',
          lastProjectId: 'project-a',
        },
      ]);
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof prisma) => unknown) => {
      return callback(prisma);
    });

    const first = await service.acquireLease({
      runtimeId: 'runtime-1',
      lanes: ['dev'],
    });
    const second = await service.acquireLease({
      runtimeId: 'runtime-1',
      lanes: ['dev'],
    });

    expect(first.lease?.projectId).toBe('project-a');
    expect(second.lease?.projectId).toBe('project-b');
    expect(prisma.schedulerLaneCursor.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ lane: 'DEV', lastProjectId: 'project-a' }),
        update: { lastProjectId: 'project-a' },
      }),
    );
    expect(prisma.schedulerLaneCursor.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ lane: 'DEV', lastProjectId: 'project-b' }),
        update: { lastProjectId: 'project-b' },
      }),
    );
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'scheduler.lease.granted',
        runtimeId: 'runtime-1',
      }),
    );
  });

  it('resets a stale cursor when the previously selected project is no longer eligible', async () => {
    prisma.workItem.findMany.mockResolvedValue([
      {
        id: 'work-2',
        projectId: 'project-b',
        title: 'Only remaining task',
        state: 'READY_FOR_DEV',
        priority: 'HIGH',
        sortOrder: 1,
        stateUpdatedAt: new Date('2026-03-09T11:15:00.000Z'),
      },
    ]);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'project-b',
        queueLimits: {
          maxInDev: 3,
          maxInReview: 2,
          maxReadyForRelease: 2,
        },
      },
    ]);
    prisma.workItemLease.findFirst.mockResolvedValue(null);
    prisma.workItemLease.create.mockResolvedValue({
      id: 'lease-2',
      projectId: 'project-b',
      workItemId: 'work-2',
      runtimeId: 'runtime-1',
      lane: 'DEV',
      status: 'ACTIVE',
      leaseToken: 'token-2',
      leasedAt: now,
      expiresAt: new Date('2026-03-09T12:10:00.000Z'),
      renewedAt: null,
      releasedAt: null,
      recoveredAt: null,
      recoveryReason: null,
      workItem: {
        title: 'Only remaining task',
        state: 'READY_FOR_DEV',
      },
    });
    prisma.schedulerLaneCursor.findMany.mockResolvedValue([
      {
        lane: 'DEV',
        lastProjectId: 'project-a',
      },
    ]);
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof prisma) => unknown) => {
      return callback(prisma);
    });

    const result = await service.acquireLease({
      runtimeId: 'runtime-1',
      lanes: ['dev'],
    });

    expect(result.lease?.projectId).toBe('project-b');
    expect(prisma.schedulerLaneCursor.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        create: expect.objectContaining({ lane: 'DEV', lastProjectId: null }),
        update: { lastProjectId: null },
      }),
    );
  });

  it('reports scheduler state with skipped project reasons and lane summaries', async () => {
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'project-a',
        name: 'Alpha',
        lifecycleStatus: 'ACTIVE',
        queueLimits: {
          maxInDev: 2,
          maxInReview: 1,
          maxReadyForRelease: 1,
        },
      },
      {
        id: 'project-b',
        name: 'Beta',
        lifecycleStatus: 'PAUSED',
        queueLimits: {
          maxInDev: 1,
          maxInReview: 1,
          maxReadyForRelease: 1,
        },
      },
    ]);
    prisma.workItem.groupBy.mockResolvedValue([
      {
        projectId: 'project-a',
        state: 'READY_FOR_DEV',
        _count: { _all: 2 },
      },
      {
        projectId: 'project-a',
        state: 'IN_DEV',
        _count: { _all: 2 },
      },
      {
        projectId: 'project-b',
        state: 'READY_FOR_REVIEW',
        _count: { _all: 1 },
      },
    ]);
    prisma.workItemLease.groupBy.mockResolvedValue([
      {
        projectId: 'project-a',
        lane: 'DEV',
        _count: { _all: 1 },
      },
    ]);
    prisma.humanInterventionCase = {
      groupBy: vi.fn().mockResolvedValue([
        {
          projectId: 'project-b',
          _count: { _all: 1 },
        },
      ]),
    } as never;
    prisma.schedulerLaneCursor.findMany.mockResolvedValue([
      {
        lane: 'DEV',
        lastProjectId: 'project-a',
      },
    ]);

    const state = await service.getSchedulerState();

    expect(state.projectId).toBeNull();
    expect(state.cursors).toEqual([
      {
        lane: 'dev',
        lastProjectId: 'project-a',
      },
    ]);
    expect(state.laneSummaries).toEqual([
      {
        lane: 'planning',
        readyCount: 0,
        inProgressCount: 0,
        activeLeaseCount: 0,
      },
      {
        lane: 'dev',
        readyCount: 2,
        inProgressCount: 2,
        activeLeaseCount: 1,
      },
      {
        lane: 'review',
        readyCount: 1,
        inProgressCount: 0,
        activeLeaseCount: 0,
      },
      {
        lane: 'release',
        readyCount: 0,
        inProgressCount: 0,
        activeLeaseCount: 0,
      },
    ]);
    expect(state.skippedProjects).toEqual([
      {
        projectId: 'project-a',
        projectName: 'Alpha',
        reasons: ['queueCapReached'],
      },
      {
        projectId: 'project-b',
        projectName: 'Beta',
        reasons: ['paused', 'openIntervention'],
      },
    ]);
  });
});