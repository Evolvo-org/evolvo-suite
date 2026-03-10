import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DevAgentService } from './dev-agent.service.js';

describe('DevAgentService', () => {
  let prisma: {
    project: { findUnique: ReturnType<typeof vi.fn> };
    workItem: { findFirst: ReturnType<typeof vi.fn> };
  };
  let projectsService: {
    ensureProjectExists: ReturnType<typeof vi.fn>;
    resolveProjectAgentRoute: ReturnType<typeof vi.fn>;
  };
  let workflowService: {
    transitionWorkItem: ReturnType<typeof vi.fn>;
    createWorkItemComment: ReturnType<typeof vi.fn>;
  };
  let worktreesService: {
    upsertWorktree: ReturnType<typeof vi.fn>;
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
  let service: DevAgentService;

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
          parent: null,
          acceptanceCriteria: [{ text: 'Dashboard shows queue counts.' }],
          dependencies: [],
        }),
      },
    };
    projectsService = {
      ensureProjectExists: vi.fn().mockResolvedValue(undefined),
      resolveProjectAgentRoute: vi.fn().mockResolvedValue({
        projectId: 'project-1',
        agentType: 'dev',
        provider: 'openai',
        model: 'gpt-5.4-mini',
        source: 'system-agent',
      }),
    };
    workflowService = {
      transitionWorkItem: vi.fn().mockResolvedValue(undefined),
      createWorkItemComment: vi.fn().mockResolvedValue(undefined),
    };
    worktreesService = {
      upsertWorktree: vi
        .fn()
        .mockResolvedValueOnce({
          id: 'tree-1',
          path: '/worktrees/evolvo-suite/dev/work-1-implement-queue-dashboard',
          branchName: 'dev/work-1-implement-queue-dashboard',
        })
        .mockResolvedValueOnce({
          id: 'tree-1',
          path: '/worktrees/evolvo-suite/dev/work-1-implement-queue-dashboard',
          branchName: 'dev/work-1-implement-queue-dashboard',
        }),
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

    service = new DevAgentService(
      prisma as never,
      projectsService as never,
      workflowService as never,
      worktreesService as never,
      agentsService as never,
      usageService as never,
    );
  });

  it('implements ready-for-dev work in a task-scoped worktree and advances it for review', async () => {
    const result = await service.executeTask('project-1', 'work-1', {
      runtimeId: 'runtime-1',
    });

    expect(result.nextState).toBe('readyForReview');
    expect(result.artifactLabels).toEqual(['Implementation patch', 'Execution checks']);
    expect(result.checks).toHaveLength(4);
    expect(workflowService.transitionWorkItem).toHaveBeenCalledTimes(2);
    expect(worktreesService.upsertWorktree).toHaveBeenCalledTimes(2);
    expect(agentsService.createArtifact).toHaveBeenCalledTimes(2);
    expect(usageService.createUsageEvent).toHaveBeenCalledOnce();
  });
});
