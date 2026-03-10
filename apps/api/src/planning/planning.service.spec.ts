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
        create: vi.fn().mockResolvedValue({ id: 'work-1', title: 'Plan Delivery plan v2' }),
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

  it('queues a single planning request from the active development plan', async () => {
    const result = await service.expandPlan('project-1');

    expect(result.activePlanVersionNumber).toBe(2);
    expect(result.queuedItems).toEqual([
      {
        workItemId: 'work-1',
        title: 'Plan Delivery plan v2',
        state: 'planning',
      },
    ]);
    expect(prisma.workItem.create).toHaveBeenCalledTimes(1);
    expect(prisma.workItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Plan Delivery plan v2',
          priority: 'MEDIUM',
        }),
      }),
    );
  });

  it('skips the active plan when it already exists in the backlog', async () => {
    prisma.epic.findFirst.mockResolvedValue({ id: 'epic-planning', title: 'Planning requests' });
    prisma.workItem.findMany.mockResolvedValue([{ title: 'Plan Delivery plan v2' }]);

    service = new PlanningService(
      prisma as never,
      projectsService as never,
      developmentPlansService as never,
    );

    const result = await service.expandPlan('project-1');

    expect(result.queuedItems).toEqual([]);
    expect(result.skippedTitles).toEqual(['Plan Delivery plan v2']);
    expect(prisma.epic.create).not.toHaveBeenCalled();
    expect(prisma.workItem.create).not.toHaveBeenCalled();
  });
});