import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RuntimeService } from './runtime.service.js';

describe('RuntimeService', () => {
  const now = new Date('2026-03-09T12:00:00.000Z');

  let prisma: {
    runtimeInstance: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    workItemLease: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    workItem: {
      update: ReturnType<typeof vi.fn>;
    };
    workItemStateTransition: {
      create: ReturnType<typeof vi.fn>;
    };
    workItemComment: {
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let retryPolicyService: {
    evaluateFailure: ReturnType<typeof vi.fn>;
    recordFailure: ReturnType<typeof vi.fn>;
    clearFailureState: ReturnType<typeof vi.fn>;
  };
  let schedulerService: {
    renewLease: ReturnType<typeof vi.fn>;
  };
  let interventionsService: {
    getMissingConfigInterventionPayload: ReturnType<typeof vi.fn>;
    getRetryThresholdInterventionPayload: ReturnType<typeof vi.fn>;
    createAutomatedCase: ReturnType<typeof vi.fn>;
  };
  let logsService: {
    writeLog: ReturnType<typeof vi.fn>;
  };
  let service: RuntimeService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    prisma = {
      runtimeInstance: {
        findUnique: vi.fn().mockResolvedValue({ id: 'runtime-1' }),
        update: vi.fn().mockResolvedValue({
          id: 'runtime-1',
          displayName: 'Runtime 1',
          status: 'IDLE',
          capabilities: [],
          activeJobSummary: null,
          lastAction: null,
          lastError: null,
          lastSeenAt: now,
          createdAt: now,
          updatedAt: now,
        }),
      },
      workItemLease: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'lease-1',
          projectId: 'project-1',
          workItemId: 'work-1',
          runtimeId: 'runtime-1',
          lane: 'DEV',
          status: 'ACTIVE',
          leaseToken: 'lease-token',
          expiresAt: new Date('2026-03-09T12:10:00.000Z'),
          workItem: {
            title: 'Runtime task',
            state: 'IN_DEV',
          },
        }),
        update: vi.fn().mockResolvedValue({
          id: 'lease-1',
          projectId: 'project-1',
          workItemId: 'work-1',
          runtimeId: 'runtime-1',
          lane: 'DEV',
          status: 'RELEASED',
          leaseToken: 'lease-token',
          leasedAt: now,
          expiresAt: new Date('2026-03-09T12:10:00.000Z'),
          renewedAt: null,
          releasedAt: now,
          recoveredAt: null,
          recoveryReason: null,
          workItem: {
            title: 'Runtime task',
          },
        }),
      },
      workItem: {
        update: vi.fn().mockResolvedValue(undefined),
      },
      workItemStateTransition: {
        create: vi.fn().mockResolvedValue(undefined),
      },
      workItemComment: {
        create: vi.fn().mockResolvedValue(undefined),
      },
      $transaction: vi.fn(),
    };
    retryPolicyService = {
      evaluateFailure: vi.fn(),
      recordFailure: vi.fn().mockResolvedValue(undefined),
      clearFailureState: vi.fn().mockResolvedValue(undefined),
    };
    schedulerService = {
      renewLease: vi.fn().mockResolvedValue({
        id: 'lease-1',
        projectId: 'project-1',
        workItemId: 'work-1',
        runtimeId: 'runtime-1',
        lane: 'dev',
        status: 'active',
        leaseToken: 'lease-token',
        leasedAt: now.toISOString(),
        expiresAt: new Date('2026-03-09T12:15:00.000Z').toISOString(),
        renewedAt: now.toISOString(),
        releasedAt: null,
      }),
    };
    interventionsService = {
      getMissingConfigInterventionPayload: vi.fn().mockReturnValue(null),
      getRetryThresholdInterventionPayload: vi.fn().mockImplementation((decision, errorMessage, summary) => {
        if (!decision || decision.shouldEscalate !== true) {
          return null;
        }

        return {
          category: decision.category,
          attemptCount: decision.attemptCount,
          threshold: decision.threshold,
          errorMessage,
          summary,
        };
      }),
      createAutomatedCase: vi.fn().mockResolvedValue(undefined),
    };
    logsService = {
      writeLog: vi.fn().mockResolvedValue(undefined),
    };

    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof prisma) => unknown) => {
      return callback(prisma);
    });

    service = new RuntimeService(
      prisma as never,
      interventionsService as never,
      {} as never,
      schedulerService as never,
      retryPolicyService as never,
      logsService as never,
      { assertTransition: vi.fn() } as never,
    );
  });

  it('requeues failed dev work with a scheduled retry when under the threshold', async () => {
    retryPolicyService.evaluateFailure.mockResolvedValue({
      category: 'runtime',
      attemptCount: 2,
      backoffMs: 4 * 60 * 1000,
      nextRetryAt: new Date('2026-03-09T12:04:00.000Z'),
      nextState: 'readyForDev',
      shouldEscalate: false,
      threshold: 3,
    });

    const result = await service.recordJobResult('runtime-1', 'lease-1', {
      leaseToken: 'lease-token',
      outcome: 'failed',
      errorMessage: 'Runtime command failed',
    });

    expect(result.state).toBe('readyForDev');
    expect(prisma.workItem.update).toHaveBeenCalledWith({
      where: { id: 'work-1' },
      data: {
        state: 'READY_FOR_DEV',
        stateUpdatedAt: now,
      },
    });
    expect(retryPolicyService.recordFailure).toHaveBeenCalledOnce();
    expect(prisma.workItemComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: expect.stringContaining('Scheduled retry 2/3'),
        }),
      }),
    );
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'runtime.job.failed',
        projectId: 'project-1',
        workItemId: 'work-1',
      }),
    );
  });

  it('escalates failed work after the retry threshold is exceeded', async () => {
    retryPolicyService.evaluateFailure.mockResolvedValue({
      category: 'runtime',
      attemptCount: 4,
      backoffMs: 16 * 60 * 1000,
      nextRetryAt: new Date('2026-03-09T12:16:00.000Z'),
      nextState: 'readyForDev',
      shouldEscalate: true,
      threshold: 3,
    });

    const result = await service.recordJobResult('runtime-1', 'lease-1', {
      leaseToken: 'lease-token',
      outcome: 'failed',
      errorMessage: 'Runtime command failed repeatedly',
    });

    expect(result.state).toBe('requiresHumanIntervention');
    expect(prisma.workItem.update).toHaveBeenCalledWith({
      where: { id: 'work-1' },
      data: {
        state: 'REQUIRES_HUMAN_INTERVENTION',
        stateUpdatedAt: now,
      },
    });
    expect(prisma.runtimeInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DEGRADED',
        }),
      }),
    );
    expect(interventionsService.createAutomatedCase).toHaveBeenCalledWith(
      'project-1',
      'work-1',
      expect.objectContaining({
        category: 'runtime',
        attemptCount: 4,
        threshold: 3,
      }),
    );
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'runtime.job.failed',
        projectId: 'project-1',
      }),
    );
  });

  it('creates an immediate intervention for missing configuration failures', async () => {
    interventionsService.getMissingConfigInterventionPayload.mockReturnValue({
      category: 'missingConfig',
      errorMessage: 'Missing secret PROD_TOKEN in runtime environment',
      summary: null,
    });

    const result = await service.recordJobResult('runtime-1', 'lease-1', {
      leaseToken: 'lease-token',
      outcome: 'failed',
      errorMessage: 'Missing secret PROD_TOKEN in runtime environment',
    });

    expect(result.state).toBe('requiresHumanIntervention');
    expect(retryPolicyService.evaluateFailure).not.toHaveBeenCalled();
    expect(interventionsService.createAutomatedCase).toHaveBeenCalledWith(
      'project-1',
      'work-1',
      expect.objectContaining({
        category: 'missingConfig',
      }),
    );
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'runtime.job.failed',
      }),
    );
  });

  it('persists structured progress logs for active leases', async () => {
    prisma.workItemLease.update.mockResolvedValueOnce({
      id: 'lease-1',
      projectId: 'project-1',
      workItemId: 'work-1',
      runtimeId: 'runtime-1',
      lane: 'DEV',
      status: 'ACTIVE',
      leaseToken: 'lease-token',
      leasedAt: now,
      expiresAt: new Date('2026-03-09T12:15:00.000Z'),
      renewedAt: now,
      releasedAt: null,
      recoveredAt: null,
      recoveryReason: null,
      workItem: {
        title: 'Runtime task',
      },
    });

    await service.recordProgress('runtime-1', 'lease-1', {
      leaseToken: 'lease-token',
      activeJobSummary: 'Preparing repository',
      lastAction: 'Repository sync finished.',
      progressPercent: 20,
    });

    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'runtime.progress.recorded',
        projectId: 'project-1',
        workItemId: 'work-1',
        runtimeId: 'runtime-1',
        payload: expect.objectContaining({
          lane: 'dev',
          activeJobSummary: 'Preparing repository',
          lastAction: 'Repository sync finished.',
          progressPercent: 20,
        }),
      }),
    );
  });
});
