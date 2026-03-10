import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkflowService } from './workflow.service.js';

describe('WorkflowService planning approval gate', () => {
  let prisma: {
    workItem: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    developmentPlan: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    workItemStateTransition: {
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let service: WorkflowService;

  beforeEach(() => {
    prisma = {
      workItem: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'work-1',
          projectId: 'project-1',
          state: 'PLANNING',
        }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue(undefined),
      },
      developmentPlan: {
        findUnique: vi.fn().mockResolvedValue({
          activeVersionId: 'version-2',
          planningApprovedVersionId: null,
          planningApprovedAt: null,
        }),
      },
      workItemStateTransition: {
        create: vi.fn().mockResolvedValue(undefined),
      },
      $transaction: vi.fn().mockImplementation(async (callback) =>
        callback({
          workItem: prisma.workItem,
          workItemStateTransition: prisma.workItemStateTransition,
        }),
      ),
    };

    service = new WorkflowService(
      prisma as never,
      { ensureProjectExists: vi.fn().mockResolvedValue(undefined) } as never,
      { writeLog: vi.fn().mockResolvedValue(undefined) } as never,
      { publishProjectEvent: vi.fn() } as never,
      { assertTransition: vi.fn() } as never,
    );
  });

  it('blocks promotion to ready for dev when planning approval is missing', async () => {
    await expect(
      service.transitionWorkItem('project-1', 'work-1', {
        toState: 'readyForDev',
      }),
    ).rejects.toThrow('Planning approval is required before work can move to ready for dev.');
  });

  it('allows promotion to ready for dev when the active plan version is approved', async () => {
    prisma.developmentPlan.findUnique.mockResolvedValue({
      activeVersionId: 'version-2',
      planningApprovedVersionId: 'version-2',
      planningApprovedAt: new Date('2026-03-10T12:00:00.000Z'),
    });

    await expect(
      service.transitionWorkItem('project-1', 'work-1', {
        toState: 'readyForDev',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        projectId: 'project-1',
        columns: expect.any(Array),
        counts: expect.any(Object),
      }),
    );

    expect(prisma.workItem.update).toHaveBeenCalledOnce();
    expect(prisma.workItemStateTransition.create).toHaveBeenCalledOnce();
    expect(prisma.workItem.findMany).toHaveBeenCalledOnce();
  });
});