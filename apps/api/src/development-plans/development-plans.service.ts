import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@repo/db/client';
import type {
  ActivateDevelopmentPlanVersionRequest,
  ApproveDevelopmentPlanRequest,
  CreateDevelopmentPlanRequest,
  DevelopmentPlanApprovalAuditResponse,
  DevelopmentPlanResponse,
  DevelopmentPlanVersionsResponse,
  UpdateDevelopmentPlanRequest,
} from '@repo/shared';

import { LogsService } from '../logs/logs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { ReadyForDevPromotionService } from '../workflow/ready-for-dev-promotion.service.js';

import {
  mapDevelopmentPlanApprovalAudit,
  mapDevelopmentPlan,
  mapDevelopmentPlanVersions,
} from './development-plans.mapper.js';

@Injectable()
export class DevelopmentPlansService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(LogsService)
    private readonly logsService: LogsService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(ReadyForDevPromotionService)
    private readonly readyForDevPromotionService: ReadyForDevPromotionService,
  ) {}

  public async getDevelopmentPlan(
    projectId: string,
  ): Promise<DevelopmentPlanResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const developmentPlan = await this.findDevelopmentPlan(projectId);
    return mapDevelopmentPlan(projectId, developmentPlan);
  }

  public async createDevelopmentPlan(
    projectId: string,
    payload: CreateDevelopmentPlanRequest,
  ): Promise<DevelopmentPlanResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const existing = await this.prisma.developmentPlan.findUnique({
      where: { projectId },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A development plan already exists for this project.',
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      const plan = await transaction.developmentPlan.create({
        data: {
          projectId,
          title: payload.title.trim(),
        },
      });

      const version = await transaction.planVersion.create({
        data: {
          developmentPlanId: plan.id,
          versionNumber: 1,
          title: payload.title.trim(),
          content: payload.content.trim(),
        },
      });

      await transaction.developmentPlan.update({
        where: { id: plan.id },
        data: {
          activeVersionId: version.id,
        },
      });
    });

    const developmentPlan = await this.findDevelopmentPlan(projectId);
    return mapDevelopmentPlan(projectId, developmentPlan);
  }

  public async updateDevelopmentPlan(
    projectId: string,
    payload: UpdateDevelopmentPlanRequest,
  ): Promise<DevelopmentPlanResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const developmentPlan = await this.prisma.developmentPlan.findUnique({
      where: { projectId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!developmentPlan) {
      throw new NotFoundException('Development plan not found.');
    }

    await this.prisma.$transaction(async (transaction) => {
      const nextVersionNumber =
        (developmentPlan.versions[0]?.versionNumber ?? 0) + 1;
      const title = payload.title?.trim() ?? developmentPlan.title;
      const version = await transaction.planVersion.create({
        data: {
          developmentPlanId: developmentPlan.id,
          versionNumber: nextVersionNumber,
          title,
          content: payload.content.trim(),
          summary: payload.summary?.trim(),
        },
      });

      await transaction.developmentPlan.update({
        where: { id: developmentPlan.id },
        data: {
          title,
          activeVersionId:
            payload.activate === false
              ? developmentPlan.activeVersionId
              : version.id,
        },
      });

      await this.clearPlanningApprovalForPlan(transaction, developmentPlan, {
        actorName: 'System',
        summary: 'Development plan content changed after approval.',
      });
    });

    return mapDevelopmentPlan(
      projectId,
      await this.findDevelopmentPlan(projectId),
    );
  }

  public async listPlanVersions(
    projectId: string,
  ): Promise<DevelopmentPlanVersionsResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    return mapDevelopmentPlanVersions(
      projectId,
      await this.findDevelopmentPlan(projectId),
    );
  }

  public async listApprovalAudit(
    projectId: string,
  ): Promise<DevelopmentPlanApprovalAuditResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const developmentPlan = await this.prisma.developmentPlan.findUnique({
      where: { projectId },
      select: { id: true },
    });

    if (!developmentPlan) {
      return mapDevelopmentPlanApprovalAudit(projectId, null, []);
    }

    const items = await this.prisma.developmentPlanApprovalAudit.findMany({
      where: { developmentPlanId: developmentPlan.id },
      include: {
        planVersion: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return mapDevelopmentPlanApprovalAudit(projectId, developmentPlan.id, items);
  }

  public async activateVersion(
    projectId: string,
    payload: ActivateDevelopmentPlanVersionRequest,
  ): Promise<DevelopmentPlanResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const developmentPlan = await this.prisma.developmentPlan.findUnique({
      where: { projectId },
      select: {
        id: true,
        planningApprovedAt: true,
        planningApprovedBy: true,
        planningApprovedVersionId: true,
        planningApprovalSummary: true,
      },
    });

    if (!developmentPlan) {
      throw new NotFoundException('Development plan not found.');
    }

    const version = await this.prisma.planVersion.findFirst({
      where: {
        id: payload.versionId,
        developmentPlanId: developmentPlan.id,
      },
    });

    if (!version) {
      throw new NotFoundException('Development plan version not found.');
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.developmentPlan.update({
        where: { id: developmentPlan.id },
        data: {
          activeVersionId: version.id,
        },
      });

      await this.clearPlanningApprovalForPlan(transaction, developmentPlan, {
        actorName: 'System',
        summary: 'The active development plan version changed after approval.',
      });
    });

    return mapDevelopmentPlan(
      projectId,
      await this.findDevelopmentPlan(projectId),
    );
  }

  public async approveDevelopmentPlan(
    projectId: string,
    payload: ApproveDevelopmentPlanRequest,
  ): Promise<DevelopmentPlanResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const developmentPlan = await this.findDevelopmentPlan(projectId);

    if (!developmentPlan) {
      throw new NotFoundException('Development plan not found.');
    }

    if (!developmentPlan.activeVersionId) {
      throw new ConflictException('An active development plan version is required before approval.');
    }

    const activeVersionId = developmentPlan.activeVersionId;

    await this.logsService.writeLog({
      level: 'info',
      source: 'api',
      projectId,
      eventType: 'development-plan.approval.attempt',
      message: `Approving active development plan version ${activeVersionId}.`,
      payload: {
        developmentPlanId: developmentPlan.id,
        activeVersionId,
        actorName: payload.actorName.trim(),
      },
    });

    await this.prisma.$transaction(async (transaction) => {
      await transaction.developmentPlan.update({
        where: { id: developmentPlan.id },
        data: {
          planningApprovedAt: new Date(),
          planningApprovedBy: payload.actorName.trim(),
          planningApprovedVersionId: activeVersionId,
          planningApprovalSummary: payload.summary?.trim() ?? null,
        },
      });

      await transaction.developmentPlanApprovalAudit.create({
        data: {
          developmentPlanId: developmentPlan.id,
          planVersionId: activeVersionId,
          actorName: payload.actorName.trim(),
          summary: payload.summary?.trim(),
        },
      });

      const promotedWorkItemIds = await this.readyForDevPromotionService.promoteAvailablePlanningWork(
        projectId,
        {
          executor: transaction,
        },
      );

      if (promotedWorkItemIds.length > 0) {
        await this.logsService.writeLog({
          level: 'info',
          source: 'workflow',
          projectId,
          eventType: 'development-plan.approval.promoted-work-items',
          message: `Promoted ${promotedWorkItemIds.length} planning work item(s) to ready for dev after plan approval.`,
          payload: {
            workItemIds: promotedWorkItemIds,
            promotedCount: promotedWorkItemIds.length,
          },
        });
      }
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'api',
      projectId,
      eventType: 'development-plan.approved',
      message: `Approved active development plan version ${activeVersionId}.`,
      payload: {
        developmentPlanId: developmentPlan.id,
        activeVersionId,
        actorName: payload.actorName.trim(),
      },
    });

    return mapDevelopmentPlan(
      projectId,
      await this.findDevelopmentPlan(projectId),
    );
  }
  public async clearPlanningApproval(
    projectId: string,
    input?: {
      actorName?: string;
      summary?: string;
    },
  ): Promise<void> {
    const developmentPlan = await this.prisma.developmentPlan.findUnique({
      where: { projectId },
      select: {
        id: true,
        planningApprovedAt: true,
        planningApprovedBy: true,
        planningApprovedVersionId: true,
        planningApprovalSummary: true,
      },
    });

    if (!developmentPlan) {
      return;
    }

    await this.clearPlanningApprovalForPlan(this.prisma, developmentPlan, input);
  }

  private async findDevelopmentPlan(projectId: string) {
    return this.prisma.developmentPlan.findUnique({
      where: { projectId },
      include: {
        activeVersion: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
  }

  private async clearPlanningApprovalForPlan(
    executor: Prisma.TransactionClient | PrismaService,
    developmentPlan: {
      id: string;
      planningApprovedAt: Date | null;
      planningApprovedBy: string | null;
      planningApprovedVersionId: string | null;
      planningApprovalSummary: string | null;
    },
    input?: {
      actorName?: string;
      summary?: string;
    },
  ): Promise<void> {
    const wasApproved =
      developmentPlan.planningApprovedAt != null &&
      developmentPlan.planningApprovedVersionId != null;

    await executor.developmentPlan.update({
      where: { id: developmentPlan.id },
      data: {
        planningApprovedAt: null,
        planningApprovedBy: null,
        planningApprovedVersionId: null,
        planningApprovalSummary: null,
      },
    });

    if (!wasApproved || !developmentPlan.planningApprovedVersionId) {
      return;
    }

    await this.logsService.writeLog({
      level: 'info',
      source: 'api',
      eventType: 'development-plan.approval.reset',
      message: `Reset approval for development plan ${developmentPlan.id}.`,
      payload: {
        developmentPlanId: developmentPlan.id,
        planVersionId: developmentPlan.planningApprovedVersionId,
        actorName: input?.actorName?.trim() || 'System',
        summary:
          input?.summary?.trim() ||
          'Planning changes invalidated the previous approval.',
      },
    });

    await executor.developmentPlanApprovalAudit.create({
      data: {
        developmentPlanId: developmentPlan.id,
        planVersionId: developmentPlan.planningApprovedVersionId,
        action: 'RESET',
        actorName: input?.actorName?.trim() || 'System',
        summary:
          input?.summary?.trim() ||
          'Planning changes invalidated the previous approval.',
      },
    });
  }
}
