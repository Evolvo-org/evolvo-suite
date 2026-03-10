import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectsService } from './projects.service.js';

describe('ProjectsService agent routing', () => {
  let prisma: {
    project: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    projectAgentRouting: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
  };
  let service: ProjectsService;

  beforeEach(() => {
    prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: 'project-1' }),
      },
      projectAgentRouting: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue(undefined),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    service = new ProjectsService(
      prisma as never,
      {
        getResolvedSystemQueueLimits: vi.fn(),
        getResolvedSystemAgentRouting: vi.fn().mockResolvedValue({
          defaultProvider: 'openai',
          defaultModel: 'gpt-5.4-mini',
          agentRoutes: {
            review: {
              provider: 'anthropic',
              model: 'claude-sonnet-4',
            },
          },
        }),
      } as never,
      { writeLog: vi.fn() } as never,
    );
  });

  it('returns project override routing when present', async () => {
    prisma.projectAgentRouting.findUnique.mockResolvedValue({
      id: 'routing-1',
      projectId: 'project-1',
      defaultProvider: 'anthropic',
      defaultModel: 'claude-sonnet-4',
      agentRoutesJson: {
        dev: {
          provider: 'openai',
          model: 'gpt-5.4',
        },
      },
      updatedAt: new Date('2026-03-09T12:00:00.000Z'),
    });

    const response = await service.getProjectAgentRouting('project-1');

    expect(response.overrides?.defaultProvider).toBe('anthropic');
    expect(response.effective.agentRoutes.dev?.model).toBe('gpt-5.4');
  });

  it('resolves project agent-specific routes before defaults', async () => {
    prisma.projectAgentRouting.findUnique.mockResolvedValue({
      id: 'routing-1',
      projectId: 'project-1',
      defaultProvider: 'anthropic',
      defaultModel: 'claude-sonnet-4',
      agentRoutesJson: {
        dev: {
          provider: 'openai',
          model: 'gpt-5.4',
        },
      },
      updatedAt: new Date('2026-03-09T12:00:00.000Z'),
    });

    const response = await service.resolveProjectAgentRoute('project-1', 'dev');

    expect(response.provider).toBe('openai');
    expect(response.model).toBe('gpt-5.4');
    expect(response.source).toBe('project-agent');
  });

  it('falls back to system agent defaults when no project override exists', async () => {
    const response = await service.resolveProjectAgentRoute('project-1', 'review');

    expect(response.provider).toBe('anthropic');
    expect(response.model).toBe('claude-sonnet-4');
    expect(response.source).toBe('system-agent');
  });
});
