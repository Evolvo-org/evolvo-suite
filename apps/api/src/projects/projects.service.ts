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
  ProjectRepositoryConfigResponse,
  ProjectRepositoryInput,
  ProjectRepositoryValidationResponse,
  ProjectStatusResponse,
  UpdateProjectRequest,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';

import {
  mapProjectDetail,
  mapProjectListItem,
  mapProjectRepositoryConfig,
  mapProjectStatus,
} from './projects.mapper.js';

const createRepositoryWriteData = (repository: ProjectRepositoryInput) => ({
  provider: 'GITHUB' as const,
  owner: repository.owner.trim(),
  name: repository.name.trim(),
  url: repository.url.trim(),
  defaultBranch: repository.defaultBranch.trim(),
  baseBranch: repository.baseBranch.trim(),
});

const parseGithubRepositoryUrl = (
  value: string,
): { owner: string | null; name: string | null; normalizedUrl: string } => {
  try {
    const url = new URL(value);
    const segments = url.pathname
      .replace(/\.git$/, '')
      .split('/')
      .filter(Boolean);
    const owner = segments[0] ?? null;
    const name = segments[1] ?? null;
    const normalizedUrl =
      owner && name ? `https://github.com/${owner}/${name}` : value;

    return {
      owner,
      name,
      normalizedUrl,
    };
  } catch {
    return {
      owner: null,
      name: null,
      normalizedUrl: value,
    };
  }
};

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
              ...createRepositoryWriteData(payload.repository),
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
                create: createRepositoryWriteData(payload.repository),
                update: createRepositoryWriteData(payload.repository),
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

  public async getRepositoryConfig(
    projectId: string,
  ): Promise<ProjectRepositoryConfigResponse> {
    const repository = await this.prisma.projectRepository.findUnique({
      where: { projectId },
    });

    if (!repository) {
      throw new NotFoundException(
        'Project repository configuration not found.',
      );
    }

    return mapProjectRepositoryConfig(projectId, repository);
  }

  public async upsertRepositoryConfig(
    projectId: string,
    payload: ProjectRepositoryInput,
  ): Promise<ProjectRepositoryConfigResponse> {
    await this.ensureProjectExists(projectId);

    const repository = await this.prisma.projectRepository.upsert({
      where: { projectId },
      create: {
        projectId,
        ...createRepositoryWriteData(payload),
      },
      update: createRepositoryWriteData(payload),
    });

    return mapProjectRepositoryConfig(projectId, repository);
  }

  public validateRepositoryConfig(
    payload: ProjectRepositoryInput,
  ): ProjectRepositoryValidationResponse {
    const issues: string[] = [];
    const warnings: string[] = [];
    const parsedUrl = parseGithubRepositoryUrl(payload.url.trim());

    try {
      const url = new URL(payload.url.trim());

      if (url.hostname !== 'github.com') {
        issues.push('Repository URL must point to github.com.');
      }
    } catch {
      issues.push('Repository URL must be a valid URL.');
    }

    if (!parsedUrl.owner || !parsedUrl.name) {
      issues.push(
        'Repository URL must include both owner and repository name.',
      );
    }

    if (parsedUrl.owner && parsedUrl.owner !== payload.owner.trim()) {
      issues.push('Repository URL owner does not match the provided owner.');
    }

    if (parsedUrl.name && parsedUrl.name !== payload.name.trim()) {
      issues.push(
        'Repository URL name does not match the provided repository name.',
      );
    }

    if (payload.baseBranch.trim() !== payload.defaultBranch.trim()) {
      warnings.push(
        'Base branch differs from default branch. Confirm release and merge strategy expectations.',
      );
    }

    if (payload.url.trim().endsWith('.git')) {
      warnings.push(
        'Repository URL was normalized to remove the trailing .git suffix.',
      );
    }

    return {
      provider: 'github',
      isValid: issues.length === 0,
      normalizedUrl: parsedUrl.normalizedUrl,
      issues,
      warnings,
      inferredOwner: parsedUrl.owner,
      inferredName: parsedUrl.name,
    };
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
