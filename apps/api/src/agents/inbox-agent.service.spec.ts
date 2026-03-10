import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InboxAgentService } from './inbox-agent.service.js';

describe('InboxAgentService', () => {
  let prisma: {
    project: { findUnique: ReturnType<typeof vi.fn> };
    workItem: {
      groupBy: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    epic: {
      findFirst: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
  let projectsService: {
    ensureProjectExists: ReturnType<typeof vi.fn>;
    resolveProjectAgentRoute: ReturnType<typeof vi.fn>;
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
  let service: InboxAgentService;

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
            content: 'Support queue defaults. Add observability dashboard. Improve release safety.',
          },
          developmentPlan: {
            id: 'plan-1',
            title: 'Platform hardening',
            activeVersion: {
              versionNumber: 3,
              content: 'Phase 1 queue reliability. Phase 2 review automation.',
            },
          },
        }),
      },
      workItem: {
        groupBy: vi.fn().mockResolvedValue([{ state: 'INBOX', _count: { _all: 1 } }]),
        create: vi
          .fn()
          .mockResolvedValueOnce({ id: 'work-1', title: 'Support queue defaults' })
          .mockResolvedValueOnce({ id: 'work-2', title: 'Add observability dashboard' }),
        count: vi.fn().mockResolvedValue(0),
      },
      epic: {
        findFirst: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: 'epic-1', title: 'Inbox ideas' }),
      },
    };
    projectsService = {
      ensureProjectExists: vi.fn().mockResolvedValue(undefined),
      resolveProjectAgentRoute: vi.fn().mockResolvedValue({
        projectId: 'project-1',
        agentType: 'inbox',
        provider: 'openai',
        model: 'gpt-5.4-mini',
        source: 'system-agent',
      }),
    };
    agentsService = {
      createAgentRun: vi
        .fn()
        .mockResolvedValueOnce({ id: 'run-1' })
        .mockResolvedValueOnce({ id: 'run-2' }),
      upsertPromptSnapshot: vi.fn().mockResolvedValue(undefined),
      createDecision: vi.fn().mockResolvedValue(undefined),
      createArtifact: vi.fn().mockResolvedValue(undefined),
    };
    usageService = {
      createUsageEvent: vi
        .fn()
        .mockResolvedValueOnce({ id: 'usage-1' })
        .mockResolvedValueOnce({ id: 'usage-2' }),
    };

    service = new InboxAgentService(
      prisma as never,
      projectsService as never,
      agentsService as never,
      usageService as never,
    );
  });

  it('generates validated inbox candidates and records runs plus usage', async () => {
    const result = await service.generateIdeas('project-1', { maxIdeas: 2 });

    expect(result.candidates).toHaveLength(2);
    expect(result.items).toEqual([
      expect.objectContaining({ workItemId: 'work-1', runId: 'run-1', usageEventId: 'usage-1' }),
      expect.objectContaining({ workItemId: 'work-2', runId: 'run-2', usageEventId: 'usage-2' }),
    ]);
    expect(prisma.epic.create).toHaveBeenCalledOnce();
    expect(agentsService.createAgentRun).toHaveBeenCalledTimes(2);
    expect(usageService.createUsageEvent).toHaveBeenCalledTimes(2);
    expect(result.context.epicTitle).toBe('Inbox ideas');
    expect(result.input.agentType).toBe('inbox');
  });
});
