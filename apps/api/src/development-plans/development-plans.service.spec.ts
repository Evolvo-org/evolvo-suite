import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DevelopmentPlansService } from './development-plans.service.js';

describe('DevelopmentPlansService', () => {
  let prisma: {
    developmentPlan: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    workItem: {
      findMany: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    planVersion: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    developmentPlanApprovalAudit: {
      create: ReturnType<typeof vi.fn>;
    };
    workItemStateTransition: {
      createMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let logsService: {
    writeLog: ReturnType<typeof vi.fn>;
  };
  let service: DevelopmentPlansService;

  beforeEach(() => {
    prisma = {
      developmentPlan: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: 'plan-1',
            projectId: 'project-1',
            title: 'Delivery plan',
            activeVersionId: 'version-2',
            planningApprovedVersionId: null,
            planningApprovedAt: null,
            planningApprovedBy: null,
            planningApprovalSummary: null,
            updatedAt: new Date('2026-03-10T10:00:00.000Z'),
            activeVersion: {
              id: 'version-2',
              versionNumber: 2,
              content: 'Active plan content',
            },
            versions: [
              {
                id: 'version-2',
                versionNumber: 2,
                title: 'Delivery plan',
                summary: null,
                content: 'Active plan content',
                createdAt: new Date('2026-03-10T09:00:00.000Z'),
              },
            ],
          })
          .mockResolvedValueOnce({
            id: 'plan-1',
            projectId: 'project-1',
            title: 'Delivery plan',
            activeVersionId: 'version-2',
            planningApprovedVersionId: 'version-2',
            planningApprovedAt: new Date('2026-03-10T10:05:00.000Z'),
            planningApprovedBy: 'Operator',
            planningApprovalSummary: 'Hierarchy looks good.',
            updatedAt: new Date('2026-03-10T10:05:00.000Z'),
            activeVersion: {
              id: 'version-2',
              versionNumber: 2,
              content: 'Active plan content',
            },
            versions: [
              {
                id: 'version-2',
                versionNumber: 2,
                title: 'Delivery plan',
                summary: null,
                content: 'Active plan content',
                createdAt: new Date('2026-03-10T09:00:00.000Z'),
              },
            ],
          }),
        update: vi.fn().mockResolvedValue(undefined),
      },
      workItem: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'work-1' },
          { id: 'work-2' },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      planVersion: {
        findFirst: vi.fn(),
      },
      developmentPlanApprovalAudit: {
        create: vi.fn().mockResolvedValue(undefined),
      },
      workItemStateTransition: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      $transaction: vi.fn().mockImplementation(async (callback) =>
        callback({
          developmentPlan: prisma.developmentPlan,
          workItem: prisma.workItem,
          developmentPlanApprovalAudit: prisma.developmentPlanApprovalAudit,
          workItemStateTransition: prisma.workItemStateTransition,
        }),
      ),
    };
    logsService = {
      writeLog: vi.fn().mockResolvedValue(undefined),
    };

    service = new DevelopmentPlansService(
      prisma as never,
      logsService as never,
      { ensureProjectExists: vi.fn().mockResolvedValue(undefined) } as never,
      { assertTransition: vi.fn() } as never,
    );
  });

  it('approves the active development plan version and writes an audit event', async () => {
    const result = await service.approveDevelopmentPlan('project-1', {
      actorName: 'Operator',
      summary: 'Hierarchy looks good.',
    });

    expect(prisma.developmentPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planningApprovedVersionId: 'version-2',
          planningApprovedBy: 'Operator',
          planningApprovalSummary: 'Hierarchy looks good.',
        }),
      }),
    );
    expect(prisma.developmentPlanApprovalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          developmentPlanId: 'plan-1',
          planVersionId: 'version-2',
          actorName: 'Operator',
        }),
      }),
    );
    expect(prisma.workItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'project-1',
          state: 'PLANNING',
        }),
      }),
    );
    expect(prisma.workItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          state: 'READY_FOR_DEV',
        }),
      }),
    );
    expect(prisma.workItemStateTransition.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            workItemId: 'work-1',
            fromState: 'PLANNING',
            toState: 'READY_FOR_DEV',
          }),
        ]),
      }),
    );
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'development-plan.approval.attempt',
      }),
    );
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'development-plan.approved',
      }),
    );
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'development-plan.approval.promoted-work-items',
      }),
    );
    expect(result.planningApproval.isApproved).toBe(true);
    expect(result.planningApproval.approvedVersionId).toBe('version-2');
  });

  it('records a reset audit event when clearing an approved plan', async () => {
    prisma.developmentPlan.findUnique = vi.fn().mockResolvedValue({
      id: 'plan-1',
      planningApprovedVersionId: 'version-2',
      planningApprovedAt: new Date('2026-03-10T10:05:00.000Z'),
      planningApprovedBy: 'Operator',
      planningApprovalSummary: 'Hierarchy looks good.',
    });

    await service.clearPlanningApproval('project-1', {
      actorName: 'System',
      summary: 'Planning hierarchy changed after approval.',
    });

    expect(prisma.developmentPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planningApprovedAt: null,
          planningApprovedBy: null,
          planningApprovedVersionId: null,
          planningApprovalSummary: null,
        }),
      }),
    );
    expect(prisma.developmentPlanApprovalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          developmentPlanId: 'plan-1',
          planVersionId: 'version-2',
          action: 'RESET',
          actorName: 'System',
          summary: 'Planning hierarchy changed after approval.',
        }),
      }),
    );
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'development-plan.approval.reset',
      }),
    );
  });
});