import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, WorkItemPriority } from '@repo/db/client';

import { LogsService } from '../logs/logs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

import { WorkflowStateMachineService } from './workflow-state-machine.service.js';

const planningRequestEpicTitle = 'Planning requests';
const promotionReason =
  'The work item was promoted into ready for dev because capacity was available and planning approval is active.';

const priorityWeight: Record<WorkItemPriority, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

type Executor = Prisma.TransactionClient | PrismaService;

@Injectable()
export class ReadyForDevPromotionService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(SettingsService)
    private readonly settingsService: SettingsService,
    @Inject(LogsService)
    private readonly logsService: LogsService,
    @Inject(WorkflowStateMachineService)
    private readonly workflowStateMachineService: WorkflowStateMachineService,
  ) {}

  public async promoteAvailablePlanningWork(
    projectId: string,
    input?: {
      executor?: Executor;
      maxPromotions?: number;
      eventType?: string;
      message?: string;
    },
  ): Promise<string[]> {
    const executor = input?.executor ?? this.prisma;
    const systemQueueLimits = await this.settingsService.getResolvedSystemQueueLimits();
    const project = await executor.project.findUnique({
      where: { id: projectId },
      select: {
        queueLimits: {
          select: {
            maxReadyForDev: true,
          },
        },
        developmentPlan: {
          select: {
            activeVersionId: true,
            planningApprovedVersionId: true,
            planningApprovedAt: true,
          },
        },
      },
    });

    const isApproved =
      Boolean(project?.developmentPlan?.planningApprovedAt) &&
      project?.developmentPlan?.activeVersionId != null &&
      project.developmentPlan.activeVersionId ===
        project.developmentPlan.planningApprovedVersionId;

    if (!isApproved) {
      return [];
    }

    const maxReadyForDev =
      project?.queueLimits?.maxReadyForDev ?? systemQueueLimits.maxReadyForDev;
    const currentReadyForDev = await executor.workItem.count({
      where: {
        projectId,
        state: 'READY_FOR_DEV',
      },
    });

    const availableSlots = Math.max(0, maxReadyForDev - currentReadyForDev);
    const promotionsAllowed = Math.min(
      availableSlots,
      input?.maxPromotions ?? Number.POSITIVE_INFINITY,
    );

    if (promotionsAllowed <= 0) {
      return [];
    }

    this.workflowStateMachineService.assertTransition('planning', {
      toState: 'readyForDev',
      reason: promotionReason,
    });

    const candidates = await executor.workItem.findMany({
      where: {
        projectId,
        state: 'PLANNING',
        dependencies: {
          none: {
            dependsOnWorkItem: {
              state: {
                not: 'RELEASED',
              },
            },
          },
        },
        epic: {
          is: {
            title: {
              not: planningRequestEpicTitle,
            },
          },
        },
      },
      select: {
        id: true,
        priority: true,
        sortOrder: true,
        stateUpdatedAt: true,
        updatedAt: true,
      },
    });

    if (candidates.length === 0) {
      return [];
    }

    const promotedWorkItemIds = candidates
      .sort((left, right) => {
        const priorityDifference =
          priorityWeight[right.priority] - priorityWeight[left.priority];

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }

        if (left.stateUpdatedAt.getTime() !== right.stateUpdatedAt.getTime()) {
          return left.stateUpdatedAt.getTime() - right.stateUpdatedAt.getTime();
        }

        return left.updatedAt.getTime() - right.updatedAt.getTime();
      })
      .slice(0, promotionsAllowed)
      .map((item) => item.id);

    if (promotedWorkItemIds.length === 0) {
      return [];
    }

    const now = new Date();

    await executor.workItem.updateMany({
      where: {
        id: {
          in: promotedWorkItemIds,
        },
      },
      data: {
        state: 'READY_FOR_DEV',
        stateUpdatedAt: now,
      },
    });

    await executor.workItemStateTransition.createMany({
      data: promotedWorkItemIds.map((workItemId) => ({
        projectId,
        workItemId,
        fromState: 'PLANNING',
        toState: 'READY_FOR_DEV',
        reason: promotionReason,
        isOperatorOverride: false,
      })),
    });

    if (!input?.executor) {
      await this.logsService.writeLog({
        level: 'info',
        source: 'workflow',
        projectId,
        eventType: input?.eventType ?? 'workflow.ready-for-dev.refilled',
        message:
          input?.message ??
          `Promoted ${promotedWorkItemIds.length} planning work item(s) into ready for dev.`,
        payload: {
          workItemIds: promotedWorkItemIds,
          promotedCount: promotedWorkItemIds.length,
        },
      });
    }

    return promotedWorkItemIds;
  }
}