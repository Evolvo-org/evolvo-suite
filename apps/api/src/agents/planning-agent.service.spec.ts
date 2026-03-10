import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanningAgentService } from './planning-agent.service.js';

describe('PlanningAgentService', () => {
  let prisma: {
    project: { findUnique: ReturnType<typeof vi.fn> };
    workItem: {
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    epic: {
      findFirst: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    acceptanceCriterion: {
      count: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
    };
  };
  let projectsService: {
    ensureProjectExists: ReturnType<typeof vi.fn>;
    resolveProjectAgentRoute: ReturnType<typeof vi.fn>;
    getProjectQueueLimits: ReturnType<typeof vi.fn>;
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
  let service: PlanningAgentService;

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
            version: 2,
          },
          developmentPlan: {
            id: 'plan-1',
            title: 'Platform hardening',
            activeVersion: {
              versionNumber: 3,
            },
          },
        }),
      },
      workItem: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            id: 'work-1',
            projectId: 'project-1',
            title: 'Improve release safety',
            description: 'Add safer release controls and verification.',
            priority: 'HIGH',
            state: 'INBOX',
            epic: null,
            acceptanceCriteria: [],
          })
          .mockResolvedValueOnce(null),
        update: vi.fn().mockResolvedValue(undefined),
        create: vi
          .fn()
          .mockResolvedValueOnce({ id: 'sub-1', title: 'Define implementation scope for Improve release safety' })
          .mockResolvedValueOnce({ id: 'sub-2', title: 'Implement and verify Improve release safety' }),
        count: vi.fn().mockResolvedValueOnce(0),
      },
      epic: {
        findFirst: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: 'epic-1', title: 'Improve release safety' }),
      },
      acceptanceCriterion: {
        count: vi.fn().mockResolvedValue(0),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };
    projectsService = {
      ensureProjectExists: vi.fn().mockResolvedValue(undefined),
      resolveProjectAgentRoute: vi.fn().mockResolvedValue({
        projectId: 'project-1',
        agentType: 'planning',
        provider: 'openai',
        model: 'gpt-5.4-mini',
        source: 'system-agent',
      }),
      getProjectQueueLimits: vi.fn().mockResolvedValue({
        projectId: 'project-1',
        effective: {
          maxReadyForDev: 1,
        },
      }),
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

    service = new PlanningAgentService(
      prisma as never,
      projectsService as never,
      workflowService as never,
      agentsService as never,
      usageService as never,
    );
  });

  it('accepts an inbox idea, decomposes it, and fills ready-for-dev capacity', async () => {
    const result = await service.triageInboxIdea('project-1', 'work-1', {
      runtimeId: 'runtime-1',
    });

    expect(result.accepted).toBe(true);
    expect(result.tasks).toHaveLength(2);
    expect(result.promotedToReadyForDevIds).toEqual(['sub-1']);
    expect(workflowService.transitionWorkItem).toHaveBeenCalledTimes(4);
    expect(agentsService.createArtifact).toHaveBeenCalledOnce();
    expect(usageService.createUsageEvent).toHaveBeenCalledOnce();
  });
});
