import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReadyForDevPromotionService } from './ready-for-dev-promotion.service.js';

describe('ReadyForDevPromotionService', () => {
  let prisma: {
    project: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    workItem: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    workItemStateTransition: {
      createMany: ReturnType<typeof vi.fn>;
    };
  };
  let service: ReadyForDevPromotionService;

  beforeEach(() => {
    prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          queueLimits: {
            maxReadyForDev: 2,
          },
          developmentPlan: {
            activeVersionId: 'version-2',
            planningApprovedVersionId: 'version-2',
            planningApprovedAt: new Date('2026-03-10T12:00:00.000Z'),
          },
        }),
      },
      workItem: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'work-medium',
            priority: 'MEDIUM',
            sortOrder: 2,
            stateUpdatedAt: new Date('2026-03-10T11:00:00.000Z'),
            updatedAt: new Date('2026-03-10T11:00:00.000Z'),
          },
          {
            id: 'work-urgent',
            priority: 'URGENT',
            sortOrder: 4,
            stateUpdatedAt: new Date('2026-03-10T11:30:00.000Z'),
            updatedAt: new Date('2026-03-10T11:30:00.000Z'),
          },
          {
            id: 'work-high',
            priority: 'HIGH',
            sortOrder: 1,
            stateUpdatedAt: new Date('2026-03-10T10:00:00.000Z'),
            updatedAt: new Date('2026-03-10T10:00:00.000Z'),
          },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      workItemStateTransition: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    service = new ReadyForDevPromotionService(
      prisma as never,
      {
        getResolvedSystemQueueLimits: vi.fn().mockResolvedValue({
          maxPlanning: 10,
          maxReadyForDev: 12,
          maxInDev: 3,
          maxReadyForReview: 3,
          maxInReview: 2,
          maxReadyForRelease: 2,
          maxReviewRetries: 3,
          maxMergeConflictRetries: 2,
          maxRuntimeRetries: 3,
          maxAmbiguityRetries: 2,
        }),
      } as never,
      { writeLog: vi.fn().mockResolvedValue(undefined) } as never,
      { assertTransition: vi.fn() } as never,
    );
  });

  it('promotes only up to the available ready-for-dev slots in priority order', async () => {
    const promoted = await service.promoteAvailablePlanningWork('project-1', {
      executor: prisma as never,
    });

    expect(promoted).toEqual(['work-urgent']);
    expect(prisma.workItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: {
            in: ['work-urgent'],
          },
        },
      }),
    );
  });

  it('does nothing when the active plan version is not approved', async () => {
    prisma.project.findUnique.mockResolvedValue({
      queueLimits: {
        maxReadyForDev: 2,
      },
      developmentPlan: {
        activeVersionId: 'version-2',
        planningApprovedVersionId: null,
        planningApprovedAt: null,
      },
    });

    const promoted = await service.promoteAvailablePlanningWork('project-1', {
      executor: prisma as never,
    });

    expect(promoted).toEqual([]);
    expect(prisma.workItem.findMany).not.toHaveBeenCalled();
  });
});