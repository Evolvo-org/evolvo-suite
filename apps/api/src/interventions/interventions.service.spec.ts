import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InterventionsService } from './interventions.service.js';

describe('InterventionsService intervention rules', () => {
  let service: InterventionsService;

  beforeEach(() => {
    service = new InterventionsService(
      {
        humanInterventionCase: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        workItem: {
          findFirst: vi.fn(),
          update: vi.fn(),
        },
        workItemStateTransition: {
          create: vi.fn(),
        },
        workItemComment: {
          create: vi.fn(),
        },
        $transaction: vi.fn(),
      } as never,
      { ensureProjectExists: vi.fn() } as never,
      { assertTransition: vi.fn() } as never,
    );
  });

  it('matches the review failure threshold rule', () => {
    const result = service.getRetryThresholdInterventionPayload(
      {
        category: 'review',
        attemptCount: 4,
        threshold: 3,
        shouldEscalate: true,
      },
      'acceptanceCriteria',
      'Review retries exceeded.',
    );

    expect(result).toEqual({
      category: 'review',
      attemptCount: 4,
      threshold: 3,
      errorMessage: 'acceptanceCriteria',
      summary: 'Review retries exceeded.',
    });
  });

  it('matches the merge-conflict threshold rule', () => {
    const result = service.getRetryThresholdInterventionPayload(
      {
        category: 'mergeConflict',
        attemptCount: 2,
        threshold: 1,
        shouldEscalate: true,
      },
      'Git merge conflict while rebasing release branch.',
      'Release retries exceeded.',
    );

    expect(result?.category).toBe('mergeConflict');
    expect(result?.attemptCount).toBe(2);
    expect(result?.threshold).toBe(1);
  });

  it('matches the runtime failure threshold rule', () => {
    const result = service.getRetryThresholdInterventionPayload(
      {
        category: 'runtime',
        attemptCount: 5,
        threshold: 4,
        shouldEscalate: true,
      },
      'Runtime command failed repeatedly',
      'Runtime retries exceeded.',
    );

    expect(result?.category).toBe('runtime');
    expect(result?.errorMessage).toContain('failed repeatedly');
  });

  it('matches the ambiguity threshold rule', () => {
    const result = service.getRetryThresholdInterventionPayload(
      {
        category: 'ambiguity',
        attemptCount: 3,
        threshold: 2,
        shouldEscalate: true,
      },
      'Requirement is unclear and needs clarification',
      'Ambiguity retries exceeded.',
    );

    expect(result?.category).toBe('ambiguity');
    expect(result?.summary).toBe('Ambiguity retries exceeded.');
  });

  it('matches the missing-config rule immediately', () => {
    const result = service.getMissingConfigInterventionPayload(
      'Missing secret PROD_TOKEN in runtime environment',
      null,
    );

    expect(result).toEqual({
      category: 'missingConfig',
      errorMessage: 'Missing secret PROD_TOKEN in runtime environment',
      summary: null,
    });
  });

  it('does not match retry-threshold rules before escalation', () => {
    const result = service.getRetryThresholdInterventionPayload(
      {
        category: 'runtime',
        attemptCount: 2,
        threshold: 4,
        shouldEscalate: false,
      },
      'Runtime command failed once',
      'Retry still allowed.',
    );

    expect(result).toBeNull();
  });
});
