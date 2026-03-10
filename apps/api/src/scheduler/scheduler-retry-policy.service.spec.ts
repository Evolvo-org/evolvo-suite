import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SchedulerRetryPolicyService } from './scheduler-retry-policy.service.js';

describe('SchedulerRetryPolicyService', () => {
  let prisma: {
    workItemRetryState: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    project: {
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
    };
  };
  let service: SchedulerRetryPolicyService;

  beforeEach(() => {
    prisma = {
      workItemRetryState: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      project: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          queueLimits: {
            maxReviewRetries: 2,
            maxMergeConflictRetries: 1,
            maxRuntimeRetries: 3,
            maxAmbiguityRetries: 2,
          },
        }),
      },
    };

    service = new SchedulerRetryPolicyService(
      prisma as never,
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
          maxRuntimeRetries: 4,
          maxAmbiguityRetries: 3,
        }),
      } as never,
    );
  });

  it('uses project retry overrides and exponential backoff', async () => {
    prisma.workItemRetryState.findUnique.mockResolvedValue({
      reviewFailureCount: 0,
      mergeConflictFailureCount: 0,
      runtimeFailureCount: 1,
      ambiguityFailureCount: 0,
    });

    const decision = await service.evaluateFailure(
      'project-1',
      'work-1',
      'dev',
      'Runtime tool exited 1',
    );

    expect(decision.category).toBe('runtime');
    expect(decision.attemptCount).toBe(2);
    expect(decision.threshold).toBe(3);
    expect(decision.shouldEscalate).toBe(false);
    expect(decision.backoffMs).toBe(4 * 60 * 1000);
    expect(decision.nextState).toBe('readyForDev');
  });

  it('classifies review failures against the review threshold', async () => {
    prisma.workItemRetryState.findUnique.mockResolvedValue({
      reviewFailureCount: 2,
      mergeConflictFailureCount: 0,
      runtimeFailureCount: 0,
      ambiguityFailureCount: 0,
    });

    const decision = await service.evaluateFailure(
      'project-1',
      'work-1',
      'review',
      'Acceptance criteria failed',
    );

    expect(decision.category).toBe('review');
    expect(decision.attemptCount).toBe(3);
    expect(decision.threshold).toBe(2);
    expect(decision.shouldEscalate).toBe(true);
  });

  it('classifies merge conflicts separately from general runtime failures', async () => {
    const decision = await service.evaluateFailure(
      'project-1',
      'work-1',
      'release',
      'Git merge conflict while rebasing',
    );

    expect(decision.category).toBe('mergeConflict');
    expect(decision.threshold).toBe(1);
    expect(decision.nextState).toBe('readyForRelease');
  });
});