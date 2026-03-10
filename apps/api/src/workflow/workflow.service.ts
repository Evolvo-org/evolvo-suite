import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateWorkItemCommentRequest,
  KanbanBoardCounts,
  KanbanBoardResponse,
  TransitionWorkItemRequest,
  WorkItemAuditTrailResponse,
  WorkItemCommentsResponse,
  WorkItemDetailResponse,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { LogsService } from '../logs/logs.service.js';
import { ReadyForDevPromotionService } from './ready-for-dev-promotion.service.js';

import {
  createEmptyBoardCounts,
  mapBoardCard,
  mapBoardResponse,
  mapWorkItemAuditTrail,
  mapWorkItemCommentsResponse,
  mapWorkItemDetail,
} from './workflow.mapper.js';
import { WorkflowStateMachineService } from './workflow-state-machine.service.js';

const toPrismaState = (value: TransitionWorkItemRequest['toState']) => {
  switch (value) {
    case 'planning':
      return 'PLANNING' as const;
    case 'readyForDev':
      return 'READY_FOR_DEV' as const;
    case 'inDev':
      return 'IN_DEV' as const;
    case 'readyForReview':
      return 'READY_FOR_REVIEW' as const;
    case 'inReview':
      return 'IN_REVIEW' as const;
    case 'readyForRelease':
      return 'READY_FOR_RELEASE' as const;
    case 'requiresHumanIntervention':
      return 'REQUIRES_HUMAN_INTERVENTION' as const;
    case 'released':
      return 'RELEASED' as const;
    default:
      return 'PLANNING' as const;
  }
};

const fromPrismaState = (value: string): TransitionWorkItemRequest['toState'] => {
  switch (value) {
    case 'PLANNING':
      return 'planning';
    case 'READY_FOR_DEV':
      return 'readyForDev';
    case 'IN_DEV':
      return 'inDev';
    case 'READY_FOR_REVIEW':
      return 'readyForReview';
    case 'IN_REVIEW':
      return 'inReview';
    case 'READY_FOR_RELEASE':
      return 'readyForRelease';
    case 'REQUIRES_HUMAN_INTERVENTION':
      return 'requiresHumanIntervention';
    case 'RELEASED':
      return 'released';
    default:
      return 'planning';
  }
};

const toCommentActorType = (
  value: CreateWorkItemCommentRequest['actorType'],
) => {
  switch (value) {
    case 'agent':
      return 'AGENT' as const;
    case 'system':
      return 'SYSTEM' as const;
    default:
      return 'HUMAN' as const;
  }
};

@Injectable()
export class WorkflowService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(LogsService)
    private readonly logsService: LogsService,
    @Inject(RealtimeService)
    private readonly realtimeService: RealtimeService,
    @Inject(ReadyForDevPromotionService)
    private readonly readyForDevPromotionService: ReadyForDevPromotionService,
    @Inject(WorkflowStateMachineService)
    private readonly workflowStateMachineService: WorkflowStateMachineService,
  ) {}

  public async getBoard(projectId: string): Promise<KanbanBoardResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const workItems = await this.prisma.workItem.findMany({
      where: { projectId },
      orderBy: [
        { state: 'asc' },
        { sortOrder: 'asc' },
        { updatedAt: 'desc' },
      ],
      include: {
        epic: {
          select: {
            title: true,
          },
        },
        dependencies: {
          select: {
            dependsOnWorkItemId: true,
          },
        },
        acceptanceCriteria: {
          select: {
            isComplete: true,
          },
        },
      },
    });

    return mapBoardResponse(projectId, workItems.map(mapBoardCard));
  }

  public async getBoardCounts(projectId: string): Promise<KanbanBoardCounts> {
    const board = await this.getBoard(projectId);
    return board.counts;
  }

  public async getWorkItemDetail(
    projectId: string,
    workItemId: string,
  ): Promise<WorkItemDetailResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const workItem = await this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        projectId,
      },
      include: {
        epic: {
          select: { title: true },
        },
        parent: {
          select: { title: true },
        },
        dependencies: {
          include: {
            dependsOnWorkItem: {
              select: { title: true },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        acceptanceCriteria: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            text: true,
            isComplete: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!workItem) {
      throw new NotFoundException('Work item not found.');
    }

    return mapWorkItemDetail(projectId, workItem);
  }

  public async listWorkItemComments(
    projectId: string,
    workItemId: string,
  ): Promise<WorkItemCommentsResponse> {
    await this.assertWorkItemExists(projectId, workItemId);

    const comments = await this.prisma.workItemComment.findMany({
      where: {
        projectId,
        workItemId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return mapWorkItemCommentsResponse(projectId, workItemId, comments);
  }

  public async createWorkItemComment(
    projectId: string,
    workItemId: string,
    payload: CreateWorkItemCommentRequest,
  ): Promise<WorkItemCommentsResponse> {
    await this.assertWorkItemExists(projectId, workItemId);

    const comment = await this.prisma.workItemComment.create({
      data: {
        projectId,
        workItemId,
        actorType: toCommentActorType(payload.actorType),
        actorName:
          payload.actorName?.trim() ??
          (payload.actorType === 'agent'
            ? 'Agent'
            : payload.actorType === 'system'
              ? 'System'
              : 'Operator'),
        content: payload.content.trim(),
      },
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'workflow',
      projectId,
      workItemId,
      eventType: 'work-item.comment.created',
      message: `Comment added to work item ${workItemId}.`,
      payload: {
        commentId: comment.id,
        actorType: payload.actorType ?? 'human',
        actorName: comment.actorName,
      },
    });

    return this.listWorkItemComments(projectId, workItemId);
  }

  public async getWorkItemAuditTrail(
    projectId: string,
    workItemId: string,
  ): Promise<WorkItemAuditTrailResponse> {
    await this.assertWorkItemExists(projectId, workItemId);

    const [comments, transitions, agentRuns, reviewGateResults] = await Promise.all([
      this.prisma.workItemComment.findMany({
        where: {
          projectId,
          workItemId,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workItemStateTransition.findMany({
        where: {
          projectId,
          workItemId,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.agentRun.findMany({
        where: {
          projectId,
          workItemId,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          decisions: {
            orderBy: { createdAt: 'asc' },
          },
          failure: true,
          artifacts: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.reviewGateResult.findMany({
        where: {
          projectId,
          workItemId,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          checks: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    return mapWorkItemAuditTrail(
      projectId,
      workItemId,
      comments,
      transitions,
      agentRuns,
      reviewGateResults,
    );
  }

  public async transitionWorkItem(
    projectId: string,
    workItemId: string,
    payload: TransitionWorkItemRequest,
  ): Promise<KanbanBoardResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const workItem = await this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        projectId,
      },
    });

    if (!workItem) {
      throw new NotFoundException('Work item not found.');
    }

    const fromState = fromPrismaState(workItem.state);
    await this.assertPlanningApprovedForExecution(projectId, fromState, payload);
    this.workflowStateMachineService.assertTransition(fromState, payload);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.workItem.update({
        where: { id: workItem.id },
        data: {
          state: toPrismaState(payload.toState),
          stateUpdatedAt: new Date(),
        },
      });

      await transaction.workItemStateTransition.create({
        data: {
          projectId,
          workItemId: workItem.id,
          fromState: workItem.state,
          toState: toPrismaState(payload.toState),
          reason: payload.reason?.trim(),
          isOperatorOverride: payload.operatorOverride === true,
        },
      });
    });

    this.realtimeService.publishProjectEvent({
      name: 'project.workflow.updated',
      projectId,
      entityId: workItem.id,
      workItemId: workItem.id,
      payload: {
        toState: payload.toState,
      },
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'workflow',
      projectId,
      workItemId: workItem.id,
      eventType: 'work-item.transitioned',
      message: `Work item ${workItem.id} moved from ${fromState} to ${payload.toState}.`,
      payload: {
        fromState,
        toState: payload.toState,
        reason: payload.reason?.trim() ?? null,
        operatorOverride: payload.operatorOverride === true,
      },
    });

    if (fromState === 'readyForDev' && payload.toState !== 'readyForDev') {
      const promotedWorkItemIds = await this.readyForDevPromotionService.promoteAvailablePlanningWork(
        projectId,
        {
          maxPromotions: 1,
          eventType: 'workflow.ready-for-dev.refilled',
          message: `Refilled the ready-for-dev queue after moving ${workItem.id} out of ready for dev.`,
        },
      );

      if (promotedWorkItemIds.length > 0) {
        await this.logsService.writeLog({
          level: 'info',
          source: 'workflow',
          projectId,
          workItemId: workItem.id,
          eventType: 'workflow.ready-for-dev.refill.result',
          message: `Promoted ${promotedWorkItemIds.length} planning work item(s) after ${workItem.id} left ready for dev.`,
          payload: {
            consumedWorkItemId: workItem.id,
            promotedWorkItemIds,
          },
        });
      }
    }

    return this.getBoard(projectId);
  }

  private async assertWorkItemExists(
    projectId: string,
    workItemId: string,
  ) {
    const workItem = await this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        projectId,
      },
      select: { id: true },
    });

    if (!workItem) {
      throw new NotFoundException('Work item not found.');
    }
  }

  private async assertPlanningApprovedForExecution(
    projectId: string,
    fromState: TransitionWorkItemRequest['toState'],
    payload: TransitionWorkItemRequest,
  ): Promise<void> {
    if (fromState !== 'planning' || payload.toState !== 'readyForDev') {
      return;
    }

    const developmentPlan = await this.prisma.developmentPlan.findUnique({
      where: { projectId },
      select: {
        activeVersionId: true,
        planningApprovedVersionId: true,
        planningApprovedAt: true,
      },
    });

    const isApproved =
      Boolean(developmentPlan?.planningApprovedAt) &&
      developmentPlan?.activeVersionId != null &&
      developmentPlan.activeVersionId === developmentPlan.planningApprovedVersionId;

    if (!isApproved) {
      throw new ConflictException('Planning approval is required before work can move to ready for dev.');
    }
  }
}
