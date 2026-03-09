import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { defaultProjectQueueLimits } from '@repo/shared';
import type {
  CreateProjectRequest,
  ProjectDetail,
  ProjectListFilters,
  ProjectStatusResponse,
  UpdateProjectRequest,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service';

import {
  mapProjectDetail,
  mapProjectListItem,
  mapProjectStatus,
} from './projects.mapper';

const mapProjectLifecycleStatus = (
  value: ProjectListFilters['lifecycleStatus'],
) => {
  if (value === 'active') {
    return 'ACTIVE' as const;
  }

  if (value === 'paused') {
    return 'PAUSED' as const;
  }

  if (value === 'draft') {
    return 'DRAFT' as const;
  }

  return undefined;
};

const createSlugBase = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
};

@Injectable()
export class ProjectsService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  public async createProject(
    payload: CreateProjectRequest,
  ): Promise<ProjectDetail> {
    const slug = await this.createUniqueSlug(payload.name);

    const project = await this.prisma.$transaction(async (transaction) => {
      const createdProject = await transaction.project.create({
        data: {
          name: payload.name.trim(),
          slug,
          repository: {
            create: {
              provider: 'GITHUB',
              owner: payload.repository.owner.trim(),
              name: payload.repository.name.trim(),
              url: payload.repository.url.trim(),
              defaultBranch: payload.repository.defaultBranch.trim(),
              baseBranch: payload.repository.baseBranch.trim(),
            },
          },
          queueLimits: {
            create: {
              ...(payload.queueLimits ?? defaultProjectQueueLimits),
            },
          },
          productSpec: {
            create: {
              content: payload.productDescription.trim(),
              version: 1,
            },
          },
          developmentPlan: payload.developmentPlan
            ? {
                create: {
                  title: `${payload.name.trim()} development plan`,
                  versions: {
                    create: {
                      versionNumber: 1,
                      title: `${payload.name.trim()} development plan`,
                      content: payload.developmentPlan.trim(),
                    },
                  },
                },
              }
            : undefined,
        },
        include: {
          repository: true,
          queueLimits: true,
          productSpec: true,
          developmentPlan: {
            include: {
              activeVersion: true,
              versions: {
                orderBy: { versionNumber: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (
        createdProject.developmentPlan &&
        !createdProject.developmentPlan.activeVersionId
      ) {
        const initialVersion = createdProject.developmentPlan.versions[0];

        if (initialVersion) {
          await transaction.developmentPlan.update({
            where: { id: createdProject.developmentPlan.id },
            data: {
              activeVersionId: initialVersion.id,
            },
          });
        }
      }

      return transaction.project.findUniqueOrThrow({
        where: { id: createdProject.id },
        include: {
          repository: true,
          queueLimits: true,
          productSpec: true,
          developmentPlan: {
            include: {
              activeVersion: true,
            },
          },
        },
      });
    });

    return mapProjectDetail(project);
  }

  public async listProjects(filters: ProjectListFilters) {
    const projects = await this.prisma.project.findMany({
      where: {
        name: filters.query
          ? {
              contains: filters.query,
              mode: 'insensitive',
            }
          : undefined,
        lifecycleStatus: mapProjectLifecycleStatus(filters.lifecycleStatus),
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        repository: true,
        productSpec: true,
        developmentPlan: {
          include: {
            activeVersion: true,
          },
        },
      },
    });

    return {
      items: projects.map(mapProjectListItem),
      totalCount: projects.length,
    };
  }

  public async getProjectDetail(projectId: string): Promise<ProjectDetail> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        repository: true,
        queueLimits: true,
        productSpec: true,
        developmentPlan: {
          include: {
            activeVersion: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return mapProjectDetail(project);
  }

  public async updateProject(
    projectId: string,
    payload: UpdateProjectRequest,
  ): Promise<ProjectDetail> {
    await this.ensureProjectExists(projectId);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: payload.name?.trim(),
        repository: payload.repository
          ? {
              upsert: {
                create: {
                  provider: 'GITHUB',
                  owner: payload.repository.owner.trim(),
                  name: payload.repository.name.trim(),
                  url: payload.repository.url.trim(),
                  defaultBranch: payload.repository.defaultBranch.trim(),
                  baseBranch: payload.repository.baseBranch.trim(),
                },
                update: {
                  owner: payload.repository.owner.trim(),
                  name: payload.repository.name.trim(),
                  url: payload.repository.url.trim(),
                  defaultBranch: payload.repository.defaultBranch.trim(),
                  baseBranch: payload.repository.baseBranch.trim(),
                },
              },
            }
          : undefined,
        queueLimits: payload.queueLimits
          ? {
              upsert: {
                create: payload.queueLimits,
                update: payload.queueLimits,
              },
            }
          : undefined,
      },
      include: {
        repository: true,
        queueLimits: true,
        productSpec: true,
        developmentPlan: {
          include: {
            activeVersion: true,
          },
        },
      },
    });

    return mapProjectDetail(project);
  }

  public async startProject(projectId: string): Promise<ProjectStatusResponse> {
    await this.ensureProjectExists(projectId);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        lifecycleStatus: 'ACTIVE',
      },
    });

    return mapProjectStatus(project);
  }

  public async stopProject(projectId: string): Promise<ProjectStatusResponse> {
    await this.ensureProjectExists(projectId);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        lifecycleStatus: 'PAUSED',
      },
    });

    return mapProjectStatus(project);
  }

  public async getProjectStatus(
    projectId: string,
  ): Promise<ProjectStatusResponse> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return mapProjectStatus(project);
  }

  public async ensureProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }
  }

  private async createUniqueSlug(name: string): Promise<string> {
    const base = createSlugBase(name) || 'project';

    for (let index = 0; index < 100; index += 1) {
      const candidate = index === 0 ? base : `${base}-${index + 1}`;
      const existing = await this.prisma.project.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException('Unable to create a unique project slug.');
  }
}
