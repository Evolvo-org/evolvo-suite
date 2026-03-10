import { Inject, Injectable } from '@nestjs/common';
import type { RunProjectAutomationRequest, RunProjectAutomationResponse } from '@repo/shared';

import { DevAgentService } from '../agents/dev-agent.service.js';
import { PlanningAgentService } from '../agents/planning-agent.service.js';
import { ReleaseAgentService } from '../agents/release-agent.service.js';
import { ReviewAgentService } from '../agents/review-agent.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';

const createEmptyCounts = () => ({
  planning: 0,
  readyForDev: 0,
  inDev: 0,
  readyForReview: 0,
  inReview: 0,
  readyForRelease: 0,
  requiresHumanIntervention: 0,
  released: 0,
});

@Injectable()
export class AutomationService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(PlanningAgentService)
    private readonly planningAgentService: PlanningAgentService,
    @Inject(DevAgentService)
    private readonly devAgentService: DevAgentService,
    @Inject(ReviewAgentService)
    private readonly reviewAgentService: ReviewAgentService,
    @Inject(ReleaseAgentService)
    private readonly releaseAgentService: ReleaseAgentService,
  ) {}

  public async runProjectAutomation(
    projectId: string,
    payload: RunProjectAutomationRequest = {},
  ): Promise<RunProjectAutomationResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { lifecycleStatus: true },
    });

    const counts = await this.getBoardCounts(projectId);
    if (!project || project.lifecycleStatus !== 'ACTIVE') {
      return {
        projectId,
        actions: [],
        counts,
      };
    }

    const maxActions = payload.maxActions ?? 5;
    const actions: RunProjectAutomationResponse['actions'] = [];
    const attemptedWorkItemIds = new Set<string>();

    for (let index = 0; index < maxActions; index += 1) {
      const snapshot = await this.getAutomationSnapshot(projectId, attemptedWorkItemIds);
      const action = await this.selectNextAction(projectId, snapshot);

      if (!action) {
        break;
      }

      const result = await action.run();
      if (action.workItemId) {
        attemptedWorkItemIds.add(action.workItemId);
      }

      actions.push({
        lane: action.lane,
        workItemId: action.workItemId,
        summary: result,
      });
    }

    return {
      projectId,
      actions,
      counts: await this.getBoardCounts(projectId),
    };
  }

  private async selectNextAction(
    projectId: string,
    snapshot: Awaited<ReturnType<AutomationService['getAutomationSnapshot']>>,
  ) {
    if (snapshot.openInterventions > 0) {
      return null;
    }

    if (snapshot.readyForReleaseWorkItemId) {
      const workItemId = snapshot.readyForReleaseWorkItemId;

      return {
        lane: 'release' as const,
        workItemId,
        run: async () => {
          const result = await this.releaseAgentService.executeRelease(projectId, workItemId, {});

          return result.comment;
        },
      };
    }

    if (snapshot.readyForReviewWorkItemId) {
      const workItemId = snapshot.readyForReviewWorkItemId;

      return {
        lane: 'review' as const,
        workItemId,
        run: async () => {
          const result = await this.reviewAgentService.executeReview(projectId, workItemId, {});

          return result.comment;
        },
      };
    }

    if (snapshot.readyForDevWorkItemId) {
      const workItemId = snapshot.readyForDevWorkItemId;

      return {
        lane: 'dev' as const,
        workItemId,
        run: async () => {
          const result = await this.devAgentService.executeTask(projectId, workItemId, {});

          return result.comment;
        },
      };
    }

    if (snapshot.planningWorkItemId) {
      const workItemId = snapshot.planningWorkItemId;

      return {
        lane: 'planning' as const,
        workItemId,
        run: async () => {
          const result = await this.planningAgentService.executePlanning(projectId, workItemId, {});

          return result.comment;
        },
      };
    }

    return null;
  }

  private async getAutomationSnapshot(
    projectId: string,
    attemptedWorkItemIds: Set<string>,
  ) {
    const attemptedIds = [...attemptedWorkItemIds];
    const excludedWhere =
      attemptedIds.length > 0
        ? {
            id: {
              notIn: attemptedIds,
            },
          }
        : {};

    const [counts, openInterventions, planning, readyForDev, readyForReview, readyForRelease] =
      await Promise.all([
        this.getBoardCounts(projectId),
        this.prisma.humanInterventionCase.count({
          where: {
            projectId,
            status: 'OPEN',
          },
        }),
        this.prisma.workItem.findFirst({
          where: {
            projectId,
            state: 'PLANNING',
            ...excludedWhere,
          },
          orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'asc' }],
          select: { id: true },
        }),
        this.prisma.workItem.findFirst({
          where: {
            projectId,
            state: 'READY_FOR_DEV',
            ...excludedWhere,
          },
          orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'asc' }],
          select: { id: true },
        }),
        this.prisma.workItem.findFirst({
          where: {
            projectId,
            state: 'READY_FOR_REVIEW',
            ...excludedWhere,
          },
          orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'asc' }],
          select: { id: true },
        }),
        this.prisma.workItem.findFirst({
          where: {
            projectId,
            state: 'READY_FOR_RELEASE',
            ...excludedWhere,
          },
          orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'asc' }],
          select: { id: true },
        }),
      ]);

    return {
      counts,
      openInterventions,
      planningWorkItemId: planning?.id ?? null,
      readyForDevWorkItemId: readyForDev?.id ?? null,
      readyForReviewWorkItemId: readyForReview?.id ?? null,
      readyForReleaseWorkItemId: readyForRelease?.id ?? null,
      nonTerminalCount:
        counts.planning +
        counts.readyForDev +
        counts.inDev +
        counts.readyForReview +
        counts.inReview +
        counts.readyForRelease,
    };
  }

  private async getBoardCounts(projectId: string) {
    const grouped = await this.prisma.workItem.groupBy({
      by: ['state'],
      where: { projectId },
      _count: { _all: true },
    });

    const counts = createEmptyCounts();

    for (const item of grouped) {
      const total = item._count._all;
      switch (item.state) {
        case 'PLANNING':
          counts.planning = total;
          break;
        case 'READY_FOR_DEV':
          counts.readyForDev = total;
          break;
        case 'IN_DEV':
          counts.inDev = total;
          break;
        case 'READY_FOR_REVIEW':
          counts.readyForReview = total;
          break;
        case 'IN_REVIEW':
          counts.inReview = total;
          break;
        case 'READY_FOR_RELEASE':
          counts.readyForRelease = total;
          break;
        case 'REQUIRES_HUMAN_INTERVENTION':
          counts.requiresHumanIntervention = total;
          break;
        case 'RELEASED':
          counts.released = total;
          break;
      }
    }

    return counts;
  }
}
