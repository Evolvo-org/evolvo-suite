import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  KanbanBoardCounts,
  KanbanBoardResponse,
  TransitionWorkItemRequest,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';

import {
  createEmptyBoardCounts,
  mapBoardCard,
  mapBoardResponse,
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
    case 'inbox':
    default:
      return 'INBOX' as const;
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
    case 'INBOX':
    default:
      return 'inbox';
  }
};

@Injectable()
export class WorkflowService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
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

    return this.getBoard(projectId);
  }
}
