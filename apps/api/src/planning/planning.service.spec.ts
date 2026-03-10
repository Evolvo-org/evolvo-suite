import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanningService } from './planning.service.js';

describe('PlanningService', () => {
  let prisma: {
    project: { findUnique: ReturnType<typeof vi.fn> };
    developmentPlan: { findUnique: ReturnType<typeof vi.fn> };
    epic: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    workItem: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
  let projectsService: {
    ensureProjectExists: ReturnType<typeof vi.fn>;
  };
  let developmentPlansService: {
    clearPlanningApproval: ReturnType<typeof vi.fn>;
  };
  let service: PlanningService;

  beforeEach(() => {
    prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'project-1',
          productSpec: {
            content: 'Operators need a planning workflow.',
          },
          developmentPlan: {
            id: 'plan-1',
            title: 'Delivery plan',
            activeVersion: {
              title: 'Delivery plan v2',
              versionNumber: 2,
              content: [
                '# Platform hardening',
                'Improve workflow resilience and approvals.',
                '',
                '# Observability',
                'Add queue visibility, dashboards, and alerts.',
              ].join('\n'),
            },
          },
        }),
      },
      developmentPlan: {
        findUnique: vi.fn(),
      },
      epic: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: 'epic-planning', title: 'Planning requests' }),
      },
      workItem: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi
          .fn()
          .mockResolvedValueOnce({ id: 'work-1', title: 'Platform hardening' })
          .mockResolvedValueOnce({ id: 'work-2', title: 'Observability' }),
      },
    };
    projectsService = {
      ensureProjectExists: vi.fn().mockResolvedValue(undefined),
    };
    developmentPlansService = {
      clearPlanningApproval: vi.fn().mockResolvedValue(undefined),
    };

    service = new PlanningService(
      prisma as never,
      projectsService as never,
      developmentPlansService as never,
    );
  });

  it('queues planning requests from active development plan sections', async () => {
    const result = await service.expandPlan('project-1');

    expect(result.activePlanVersionNumber).toBe(2);
    expect(result.queuedItems).toEqual([
      {
        workItemId: 'work-1',
        title: 'Platform hardening',
        state: 'planning',
      },
      {
        workItemId: 'work-2',
        title: 'Observability',
        state: 'planning',
      },
    ]);
    expect(prisma.workItem.create).toHaveBeenCalledTimes(2);
    expect(prisma.workItem.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Platform hardening',
          priority: 'MEDIUM',
        }),
      }),
    );
  });

  it('skips sections that already exist in the backlog', async () => {
    prisma.epic.findFirst.mockResolvedValue({ id: 'epic-planning', title: 'Planning requests' });
    prisma.epic.findMany.mockResolvedValue([{ title: 'Platform hardening' }]);
    prisma.workItem.create = vi
      .fn()
      .mockResolvedValueOnce({ id: 'work-2', title: 'Observability' });

    service = new PlanningService(
      prisma as never,
      projectsService as never,
      developmentPlansService as never,
    );

    const result = await service.expandPlan('project-1');

    expect(result.queuedItems).toEqual([
      {
        workItemId: 'work-2',
        title: 'Observability',
        state: 'planning',
      },
    ]);
    expect(result.skippedTitles).toEqual(['Platform hardening']);
    expect(prisma.epic.create).not.toHaveBeenCalled();
  });
});