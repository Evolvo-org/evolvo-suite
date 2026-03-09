import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ActivateDevelopmentPlanVersionRequest,
  CreateDevelopmentPlanRequest,
  DevelopmentPlanResponse,
  DevelopmentPlanVersionsResponse,
  UpdateDevelopmentPlanRequest,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';

import {
  mapDevelopmentPlan,
  mapDevelopmentPlanVersions,
} from './development-plans.mapper';

@Injectable()
export class DevelopmentPlansService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
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

  public async activateVersion(
    projectId: string,
    payload: ActivateDevelopmentPlanVersionRequest,
  ): Promise<DevelopmentPlanResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const developmentPlan = await this.prisma.developmentPlan.findUnique({
      where: { projectId },
      select: { id: true },
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

    await this.prisma.developmentPlan.update({
      where: { id: developmentPlan.id },
      data: {
        activeVersionId: version.id,
      },
    });

    return mapDevelopmentPlan(
      projectId,
      await this.findDevelopmentPlan(projectId),
    );
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
}
