import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewAgentService } from './review-agent.service.js';

describe('ReviewAgentService', () => {
  let prisma: {
    project: { findUnique: ReturnType<typeof vi.fn> };
    workItem: { findFirst: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let interventionsService: {
    getRetryThresholdInterventionPayload: ReturnType<typeof vi.fn>;
    createAutomatedCase: ReturnType<typeof vi.fn>;
  };
  let projectsService: {
    ensureProjectExists: ReturnType<typeof vi.fn>;
    resolveProjectAgentRoute: ReturnType<typeof vi.fn>;
  };
  let reviewGatesService: {
    createResult: ReturnType<typeof vi.fn>;
  };
  let retryPolicyService: {
    evaluateFailure: ReturnType<typeof vi.fn>;
    recordFailure: ReturnType<typeof vi.fn>;
    clearFailureState: ReturnType<typeof vi.fn>;
  };
  let workflowService: {
    transitionWorkItem: ReturnType<typeof vi.fn>;
    createWorkItemComment: ReturnType<typeof vi.fn>;
  };
  let agentsService: {
    createAgentRun: ReturnType<typeof vi.fn>;
    upsertPromptSnapshot: ReturnType<typeof vi.fn>;
    createDecision: ReturnType<typeof vi.fn>;
    createArtifact: ReturnType<typeof vi.fn>;
  };
  let usageService: {
    createUsageEvent: ReturnType<typeof vi.fn>;
  };
  let service: ReviewAgentService;

  beforeEach(() => {
    prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'project-1',
          name: 'Evolvo Suite',
          repository: {
            owner: 'Evolvo-org',
            name: 'evolvo-suite',
          },
          productSpec: {
            id: 'spec-1',
            version: 1,
          },
          developmentPlan: {
            id: 'plan-1',
            title: 'Platform hardening',
            activeVersion: { versionNumber: 2 },
          },
        }),
      },
      workItem: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'work-1',
          title: 'Implement queue dashboard',
          description: 'Build a queue dashboard for operators.',
          epic: { id: 'epic-1', title: 'Operations' },
          acceptanceCriteria: [{ id: 'crit-1', text: 'Dashboard shows queue counts.', sortOrder: 0 }],
          agentRuns: [{ artifacts: [{ id: 'artifact-1' }] }],
        }),
      },
      $transaction: vi.fn().mockImplementation(async (callback: (tx: unknown) => unknown) => {
        return callback({});
      }),
    };
    interventionsService = {
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
      createAutomatedCase: vi.fn().mockResolvedValue({ id: 'intervention-1' }),
    };
    projectsService = {
      ensureProjectExists: vi.fn().mockResolvedValue(undefined),
      resolveProjectAgentRoute: vi.fn().mockResolvedValue({
        projectId: 'project-1',
        agentType: 'review',
        provider: 'openai',
        model: 'gpt-5.4-mini',
        source: 'system-agent',
      }),
    };
    reviewGatesService = {
      createResult: vi.fn().mockResolvedValue({
        id: 'gate-1',
        overallStatus: 'passed',
        checks: [],
        criteriaEvaluations: [],
      }),
    };
    retryPolicyService = {
      evaluateFailure: vi.fn().mockResolvedValue({
        category: 'review',
        attemptCount: 4,
        threshold: 3,
        backoffMs: 600000,
        nextRetryAt: new Date('2026-03-09T00:10:00.000Z'),
        nextState: 'readyForDev',
        shouldEscalate: true,
      }),
      recordFailure: vi.fn().mockResolvedValue(undefined),
      clearFailureState: vi.fn().mockResolvedValue(undefined),
    };
    workflowService = {
      transitionWorkItem: vi.fn().mockResolvedValue(undefined),
      createWorkItemComment: vi.fn().mockResolvedValue(undefined),
    };
    agentsService = {
      createAgentRun: vi.fn().mockResolvedValue({ id: 'run-1' }),
      upsertPromptSnapshot: vi.fn().mockResolvedValue(undefined),
      createDecision: vi.fn().mockResolvedValue(undefined),
      createArtifact: vi.fn().mockResolvedValue(undefined),
    };
    usageService = {
      createUsageEvent: vi.fn().mockResolvedValue({ id: 'usage-1' }),
    };

    service = new ReviewAgentService(
      prisma as never,
      interventionsService as never,
      projectsService as never,
      reviewGatesService as never,
      retryPolicyService as never,
      workflowService as never,
      agentsService as never,
      usageService as never,
    );
  });

  it('records review gates and promotes passing work to ready-for-release', async () => {
    const result = await service.executeReview('project-1', 'work-1', {
      runtimeId: 'runtime-1',
    });

    expect(result.passed).toBe(true);
    expect(result.nextState).toBe('readyForRelease');
    expect(workflowService.transitionWorkItem).toHaveBeenCalledTimes(2);
    expect(retryPolicyService.clearFailureState).toHaveBeenCalledOnce();
    expect(reviewGatesService.createResult).toHaveBeenCalledOnce();
    expect(agentsService.createArtifact).toHaveBeenCalledOnce();
    expect(usageService.createUsageEvent).toHaveBeenCalledOnce();
  });

  it('escalates repeated review failures to intervention', async () => {
    prisma.workItem.findFirst.mockResolvedValueOnce({
      id: 'work-1',
      title: 'Implement queue dashboard',
      description: 'Build a queue dashboard for operators.',
      epic: { id: 'epic-1', title: 'Operations' },
      acceptanceCriteria: [{ id: 'crit-1', text: 'Dashboard shows queue counts.', sortOrder: 0 }],
      agentRuns: [{ artifacts: [] }],
    });
    reviewGatesService.createResult.mockResolvedValueOnce({
      id: 'gate-2',
      overallStatus: 'failed',
      checks: [],
      criteriaEvaluations: [],
    });

    const result = await service.executeReview('project-1', 'work-1', {
      runtimeId: 'runtime-1',
    });

    expect(result.passed).toBe(false);
    expect(result.nextState).toBe('requiresHumanIntervention');
    expect(retryPolicyService.recordFailure).toHaveBeenCalledOnce();
    expect(interventionsService.createAutomatedCase).toHaveBeenCalledOnce();
  });
});
