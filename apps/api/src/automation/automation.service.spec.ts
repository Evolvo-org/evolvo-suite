import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AutomationService } from './automation.service.js';

describe('AutomationService', () => {
  let boardState: Array<{ id: string; state: string }>;
  let prisma: {
    project: { findUnique: ReturnType<typeof vi.fn> };
    humanInterventionCase: { count: ReturnType<typeof vi.fn> };
    workItem: {
      groupBy: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
  let inboxAgentService: {
    generateIdeas: ReturnType<typeof vi.fn>;
  };
  let planningAgentService: {
    triageInboxIdea: ReturnType<typeof vi.fn>;
  };
  let devAgentService: {
    executeTask: ReturnType<typeof vi.fn>;
  };
  let reviewAgentService: {
    executeReview: ReturnType<typeof vi.fn>;
  };
  let releaseAgentService: {
    executeRelease: ReturnType<typeof vi.fn>;
  };
  let service: AutomationService;

  beforeEach(() => {
    boardState = [];
    prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({ lifecycleStatus: 'ACTIVE' }),
      },
      humanInterventionCase: {
        count: vi.fn().mockResolvedValue(0),
      },
      workItem: {
        groupBy: vi.fn().mockImplementation(async () => {
          const grouped = new Map<string, number>();
          for (const item of boardState) {
            grouped.set(item.state, (grouped.get(item.state) ?? 0) + 1);
          }

          return [...grouped.entries()].map(([state, count]) => ({
            state,
            _count: { _all: count },
          }));
        }),
        findFirst: vi.fn().mockImplementation(async ({ where }: { where: { state: string; id?: { notIn: string[] } } }) => {
          const excluded = new Set(where.id?.notIn ?? []);
          const match = boardState.find((item) => item.state === where.state && !excluded.has(item.id));
          return match ? { id: match.id } : null;
        }),
      },
    };
    inboxAgentService = {
      generateIdeas: vi.fn().mockImplementation(async () => {
        boardState = [{ id: 'work-1', state: 'INBOX' }];
        return { items: [{ workItemId: 'work-1' }] };
      }),
    };
    planningAgentService = {
      triageInboxIdea: vi.fn().mockImplementation(async (_projectId: string, workItemId: string) => {
        boardState = boardState.map((item) =>
          item.id === workItemId ? { ...item, state: 'PLANNING' } : item,
        );

        return { comment: 'planned' };
      }),
    };
    devAgentService = {
      executeTask: vi.fn().mockImplementation(async (_projectId: string, workItemId: string) => {
        boardState = boardState.map((item) =>
          item.id === workItemId ? { ...item, state: 'READY_FOR_REVIEW' } : item,
        );

        return { comment: 'dev complete' };
      }),
    };
    reviewAgentService = {
      executeReview: vi.fn().mockImplementation(async (_projectId: string, workItemId: string) => {
        boardState = boardState.map((item) =>
          item.id === workItemId ? { ...item, state: 'READY_FOR_RELEASE' } : item,
        );

        return { comment: 'review complete' };
      }),
    };
    releaseAgentService = {
      executeRelease: vi.fn().mockImplementation(async (_projectId: string, workItemId: string) => {
        boardState = boardState.map((item) =>
          item.id === workItemId ? { ...item, state: 'RELEASED' } : item,
        );

        return { comment: 'release complete' };
      }),
    };

    service = new AutomationService(
      prisma as never,
      { ensureProjectExists: vi.fn().mockResolvedValue(undefined) } as never,
      inboxAgentService as never,
      planningAgentService as never,
      devAgentService as never,
      reviewAgentService as never,
      releaseAgentService as never,
    );
  });

  it('triggers the inbox loop first for active empty projects', async () => {
    const result = await service.runProjectAutomation('project-1', {
      maxActions: 1,
    });

    expect(result.actions).toEqual([
      {
        lane: 'inbox',
        workItemId: null,
        summary: 'Generated 1 inbox idea(s).',
      },
    ]);
    expect(inboxAgentService.generateIdeas).toHaveBeenCalledWith('project-1', {
      maxIdeas: 1,
    });
  });

  it('triggers the planning loop for inbox work', async () => {
    boardState = [{ id: 'work-1', state: 'INBOX' }];

    const result = await service.runProjectAutomation('project-1', {
      maxActions: 1,
    });

    expect(result.actions).toEqual([
      {
        lane: 'planning',
        workItemId: 'work-1',
        summary: 'planned',
      },
    ]);
    expect(planningAgentService.triageInboxIdea).toHaveBeenCalledWith(
      'project-1',
      'work-1',
      {},
    );
  });

  it('triggers the dev loop for ready-for-dev work', async () => {
    boardState = [{ id: 'work-2', state: 'READY_FOR_DEV' }];

    const result = await service.runProjectAutomation('project-1', {
      maxActions: 1,
    });

    expect(result.actions[0]).toEqual({
      lane: 'dev',
      workItemId: 'work-2',
      summary: 'dev complete',
    });
    expect(devAgentService.executeTask).toHaveBeenCalledWith('project-1', 'work-2', {});
  });

  it('triggers the review loop for ready-for-review work', async () => {
    boardState = [{ id: 'work-3', state: 'READY_FOR_REVIEW' }];

    const result = await service.runProjectAutomation('project-1', {
      maxActions: 1,
    });

    expect(result.actions[0]).toEqual({
      lane: 'review',
      workItemId: 'work-3',
      summary: 'review complete',
    });
    expect(reviewAgentService.executeReview).toHaveBeenCalledWith('project-1', 'work-3', {});
  });

  it('triggers the release loop before lower-priority lanes', async () => {
    boardState = [
      { id: 'work-1', state: 'INBOX' },
      { id: 'work-2', state: 'READY_FOR_DEV' },
      { id: 'work-3', state: 'READY_FOR_REVIEW' },
      { id: 'work-4', state: 'READY_FOR_RELEASE' },
    ];

    const result = await service.runProjectAutomation('project-1', {
      maxActions: 1,
    });

    expect(result.actions[0]).toEqual({
      lane: 'release',
      workItemId: 'work-4',
      summary: 'release complete',
    });
    expect(releaseAgentService.executeRelease).toHaveBeenCalledWith('project-1', 'work-4', {});
    expect(reviewAgentService.executeReview).not.toHaveBeenCalled();
    expect(devAgentService.executeTask).not.toHaveBeenCalled();
    expect(planningAgentService.triageInboxIdea).not.toHaveBeenCalled();
  });

  it('stops automation when open interventions exist', async () => {
    boardState = [{ id: 'work-1', state: 'READY_FOR_RELEASE' }];
    prisma.humanInterventionCase.count.mockResolvedValue(2);

    const result = await service.runProjectAutomation('project-1', {
      maxActions: 3,
    });

    expect(result.actions).toEqual([]);
    expect(releaseAgentService.executeRelease).not.toHaveBeenCalled();
    expect(inboxAgentService.generateIdeas).not.toHaveBeenCalled();
  });

  it('does not reprocess the same work item repeatedly in one run', async () => {
    boardState = [{ id: 'work-1', state: 'INBOX' }];
    planningAgentService.triageInboxIdea.mockResolvedValue({ comment: 'planned once' });

    const result = await service.runProjectAutomation('project-1', {
      maxActions: 3,
    });

    expect(result.actions).toEqual([
      {
        lane: 'planning',
        workItemId: 'work-1',
        summary: 'planned once',
      },
    ]);
    expect(planningAgentService.triageInboxIdea).toHaveBeenCalledTimes(1);
  });
});
