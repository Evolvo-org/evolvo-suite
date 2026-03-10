import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReleaseAgentService } from './release-agent.service.js';

describe('ReleaseAgentService', () => {
  let prisma: {
    project: { findUnique: ReturnType<typeof vi.fn> };
    workItem: { findFirst: ReturnType<typeof vi.fn> };
    worktree: { findFirst: ReturnType<typeof vi.fn> };
    releaseRun: {
      count: ReturnType<typeof vi.fn>;
      findFirstOrThrow: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let projectsService: {
    ensureProjectExists: ReturnType<typeof vi.fn>;
    resolveProjectAgentRoute: ReturnType<typeof vi.fn>;
  };
  let releasesService: {
    startRelease: ReturnType<typeof vi.fn>;
    createVersion: ReturnType<typeof vi.fn>;
    upsertNote: ReturnType<typeof vi.fn>;
    recordResult: ReturnType<typeof vi.fn>;
  };
  let interventionsService: {
    getRetryThresholdInterventionPayload: ReturnType<typeof vi.fn>;
    createAutomatedCase: ReturnType<typeof vi.fn>;
  };
  let schedulerRetryPolicyService: {
    evaluateFailure: ReturnType<typeof vi.fn>;
    recordFailure: ReturnType<typeof vi.fn>;
    clearFailureState: ReturnType<typeof vi.fn>;
  };
  let worktreesService: {
    upsertWorktree: ReturnType<typeof vi.fn>;
  };
  let workflowService: {
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
  let service: ReleaseAgentService;

  beforeEach(() => {
    prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'project-1',
          name: 'Evolvo Suite',
          slug: 'evolvo-suite',
          repository: {
            owner: 'Evolvo-org',
            name: 'evolvo-suite',
            baseBranch: 'main',
          },
          productSpec: { id: 'spec-1', version: 1 },
          developmentPlan: {
            id: 'plan-1',
            title: 'Delivery',
            activeVersion: { versionNumber: 1 },
          },
        }),
      },
      workItem: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'work-1',
          title: 'Ship release automation',
          description: 'Automate merge, tag, and note publication.',
          epic: { id: 'epic-1', title: 'Release' },
          acceptanceCriteria: [],
        }),
      },
      worktree: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'tree-1',
          path: '/worktrees/evolvo-suite/release/work-1',
          branchName: 'release/work-1',
          headSha: 'deadbeef',
          pullRequestUrl: null,
          isDirty: false,
        }),
      },
      releaseRun: {
        count: vi.fn().mockResolvedValue(0),
        findFirstOrThrow: vi.fn().mockResolvedValue({
          id: 'release-1',
          projectId: 'project-1',
          workItemId: 'work-1',
          runtimeId: 'runtime-1',
          leaseId: null,
          worktreeId: 'tree-1',
          summary: 'failed',
          errorMessage: 'Git merge conflict while rebasing release branch.',
          mergeCommitSha: null,
          releaseUrl: null,
          startedAt: new Date('2026-03-09T00:00:00.000Z'),
          completedAt: new Date('2026-03-09T00:01:00.000Z'),
          createdAt: new Date('2026-03-09T00:00:00.000Z'),
          updatedAt: new Date('2026-03-09T00:01:00.000Z'),
          workItem: { title: 'Ship release automation', state: 'REQUIRES_HUMAN_INTERVENTION' },
          version: null,
          note: null,
        }),
      },
      $transaction: vi.fn().mockImplementation(async (callback: (tx: unknown) => unknown) => {
        return callback({
          releaseRun: { update: vi.fn().mockResolvedValue(undefined) },
          worktree: { update: vi.fn().mockResolvedValue(undefined) },
        });
      }),
    };
    projectsService = {
      ensureProjectExists: vi.fn().mockResolvedValue(undefined),
      resolveProjectAgentRoute: vi.fn().mockResolvedValue({
        projectId: 'project-1',
        agentType: 'release',
        provider: 'openai',
        model: 'gpt-5.4-mini',
        source: 'system-agent',
      }),
    };
    releasesService = {
      startRelease: vi.fn().mockResolvedValue({ id: 'release-1' }),
      createVersion: vi.fn().mockResolvedValue(undefined),
      upsertNote: vi.fn().mockResolvedValue(undefined),
      recordResult: vi.fn().mockResolvedValue({
        id: 'release-1',
        status: 'succeeded',
        version: { tagName: 'v1.0.1' },
      }),
    };
    interventionsService = {
      getRetryThresholdInterventionPayload: vi.fn().mockImplementation((decision, errorMessage, summary) => ({
        category: decision.category,
        attemptCount: decision.attemptCount,
        threshold: decision.threshold,
        errorMessage,
        summary,
      })),
      createAutomatedCase: vi.fn().mockResolvedValue({ id: 'intervention-1' }),
    };
    schedulerRetryPolicyService = {
      evaluateFailure: vi.fn().mockResolvedValue({
        category: 'mergeConflict',
        attemptCount: 1,
        threshold: 0,
        backoffMs: 600000,
        nextRetryAt: new Date('2026-03-09T00:10:00.000Z'),
        nextState: 'readyForRelease',
        shouldEscalate: true,
      }),
      recordFailure: vi.fn().mockResolvedValue(undefined),
      clearFailureState: vi.fn().mockResolvedValue(undefined),
    };
    worktreesService = {
      upsertWorktree: vi.fn().mockResolvedValue({ id: 'tree-1' }),
    };
    workflowService = {
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

    service = new ReleaseAgentService(
      prisma as never,
      projectsService as never,
      releasesService as never,
      interventionsService as never,
      schedulerRetryPolicyService as never,
      worktreesService as never,
      workflowService as never,
      agentsService as never,
      usageService as never,
    );
  });

  it('releases a ready-for-release work item successfully', async () => {
    const result = await service.executeRelease('project-1', 'work-1', {
      runtimeId: 'runtime-1',
    });

    expect(result.nextState).toBe('released');
    expect(result.releaseRun.status).toBe('succeeded');
    expect(releasesService.createVersion).toHaveBeenCalledOnce();
    expect(releasesService.upsertNote).toHaveBeenCalledOnce();
    expect(releasesService.recordResult).toHaveBeenCalledOnce();
    expect(schedulerRetryPolicyService.clearFailureState).toHaveBeenCalledOnce();
  });

  it('escalates repeated merge conflicts to intervention', async () => {
    const result = await service.executeRelease('project-1', 'work-1', {
      runtimeId: 'runtime-1',
      outcome: 'mergeConflict',
    });

    expect(result.nextState).toBe('requiresHumanIntervention');
    expect(result.interventionId).toBe('intervention-1');
    expect(schedulerRetryPolicyService.evaluateFailure).toHaveBeenCalledOnce();
    expect(interventionsService.createAutomatedCase).toHaveBeenCalledOnce();
    expect(agentsService.createArtifact).toHaveBeenCalledOnce();
  });
});
