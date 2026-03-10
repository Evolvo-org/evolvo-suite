import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@repo/db/client';
import type {
  AgentRoutingConfig,
  KanbanBoardCounts,
  CreateProjectRequest,
  ProjectDetail,
  ProjectAgentRoutingSettingsResponse,
  ProjectListFilters,
  ProjectQueueLimits,
  ProjectQueueLimitsSettingsResponse,
  ProjectRepositoryConfigResponse,
  ProjectRepositoryInput,
  ProjectRepositoryValidationResponse,
  ProjectObservabilityMetricsResponse,
  ProjectStatusResponse,
  RuntimeDashboardResponse,
  UpdateProjectRequest,
} from '@repo/shared';
import { runtimeOfflineThresholdMs } from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { LogsService } from '../logs/logs.service.js';

import {
  mapPersistedAgentRouting,
  mapProjectDetail,
  mapProjectAgentRoutingSettings,
  mapProjectListItem,
  mapProjectQueueLimitsSettings,
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

const createEmptyKanbanCounts = (): KanbanBoardCounts => ({
  planning: 0,
  readyForDev: 0,
  inDev: 0,
  readyForReview: 0,
  inReview: 0,
  readyForRelease: 0,
  requiresHumanIntervention: 0,
  released: 0,
});

const mapRuntimeReportedStatus = (value: 'IDLE' | 'BUSY' | 'DEGRADED') => {
  switch (value) {
    case 'BUSY':
      return 'busy' as const;
    case 'DEGRADED':
      return 'degraded' as const;
    default:
      return 'idle' as const;
  }
};

const toAgentRoutesJson = (
  agentRoutes: AgentRoutingConfig['agentRoutes'],
): Prisma.InputJsonValue => {
  return agentRoutes as unknown as Prisma.InputJsonValue;
};

@Injectable()
export class ProjectsService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(SettingsService)
    private readonly settingsService: SettingsService,
    @Inject(LogsService)
    private readonly logsService: LogsService,
  ) {}

  public async createProject(
    payload: CreateProjectRequest,
  ): Promise<ProjectDetail> {
    const slug = await this.createUniqueSlug(payload.name);
    const systemQueueLimits =
      await this.settingsService.getResolvedSystemQueueLimits();

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
          queueLimits: payload.queueLimits
            ? {
                create: payload.queueLimits,
              }
            : undefined,
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

    const detail = mapProjectDetail(
      project,
      payload.queueLimits ?? systemQueueLimits,
      createEmptyKanbanCounts(),
    );

    await this.logsService.writeLog({
      level: 'info',
      source: 'projects',
      projectId: project.id,
      eventType: 'project.created',
      message: `Project ${project.name} created.`,
      payload: {
        projectId: project.id,
        slug: project.slug,
        name: project.name,
      },
    });

    return detail;
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
    const [project, kanbanCounts, systemQueueLimits] = await Promise.all([
      this.prisma.project.findUnique({
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
      }),
      this.getKanbanCounts(projectId),
      this.settingsService.getResolvedSystemQueueLimits(),
    ]);

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return mapProjectDetail(
      project,
      project.queueLimits ?? systemQueueLimits,
      kanbanCounts,
    );
  }

  public async getRuntimeDashboard(
    projectId: string,
  ): Promise<RuntimeDashboardResponse> {
    await this.ensureProjectExists(projectId);

    const now = new Date();
    const [activeLeases, recentLeases, failureLogs] = await Promise.all([
      this.prisma.workItemLease.findMany({
        where: {
          projectId,
          status: 'ACTIVE',
        },
        select: {
          runtimeId: true,
        },
      }),
      this.prisma.workItemLease.findMany({
        where: {
          projectId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 50,
        select: {
          runtimeId: true,
        },
      }),
      this.prisma.structuredLogEntry.findMany({
        where: {
          projectId,
          source: 'runtime',
          eventType: 'runtime.job.failed',
          runtimeId: {
            not: null,
          },
        },
        orderBy: {
          occurredAt: 'desc',
        },
        take: 25,
        select: {
          id: true,
          runtimeId: true,
          workItemId: true,
          message: true,
          occurredAt: true,
        },
      }),
    ]);

    const runtimes = await this.prisma.runtimeInstance.findMany({
      orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
    });

    const activeJobsByRuntime = activeLeases.reduce<Record<string, number>>(
      (counts, lease) => {
        counts[lease.runtimeId] = (counts[lease.runtimeId] ?? 0) + 1;
        return counts;
      },
      {},
    );
    const recentFailuresByRuntime = failureLogs.reduce<
      Record<
        string,
        Array<{
          id: string;
          workItemId: string | null;
          message: string | null;
          occurredAt: string;
        }>
      >
    >((groups, log) => {
      if (!log.runtimeId) {
        return groups;
      }

      if (!groups[log.runtimeId]) {
        groups[log.runtimeId] = [];
      }

      const runtimeFailures = groups[log.runtimeId];
      if (!runtimeFailures) {
        return groups;
      }

      if (runtimeFailures.length < 3) {
        runtimeFailures.push({
          id: log.id,
          workItemId: log.workItemId,
          message: log.message,
          occurredAt: log.occurredAt.toISOString(),
        });
      }

      return groups;
    }, {});

    return {
      projectId,
      generatedAt: now.toISOString(),
      items: runtimes
        .map((runtime) => {
          const connectionStatus =
            now.getTime() - runtime.lastSeenAt.getTime() > runtimeOfflineThresholdMs
              ? ('offline' as const)
              : ('online' as const);

          return {
            runtimeId: runtime.id,
            displayName: runtime.displayName,
            connectionStatus,
            reportedStatus: mapRuntimeReportedStatus(runtime.status),
            capabilities: runtime.capabilities,
            heartbeatAgeSeconds: Math.max(
              0,
              Math.floor((now.getTime() - runtime.lastSeenAt.getTime()) / 1000),
            ),
            activeJobs: activeJobsByRuntime[runtime.id] ?? 0,
            activeJobSummary: runtime.activeJobSummary ?? null,
            lastAction: runtime.lastAction ?? null,
            lastError: runtime.lastError ?? null,
            lastSeenAt: runtime.lastSeenAt.toISOString(),
            recentFailures: recentFailuresByRuntime[runtime.id] ?? [],
          };
        })
        .sort((left, right) => {
          if (left.connectionStatus !== right.connectionStatus) {
            return left.connectionStatus === 'online' ? -1 : 1;
          }

          if (left.activeJobs !== right.activeJobs) {
            return right.activeJobs - left.activeJobs;
          }

          return (
            new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime()
          );
        }),
    };
  }

  public async getObservabilityMetrics(
    projectId: string,
  ): Promise<ProjectObservabilityMetricsResponse> {
    await this.ensureProjectExists(projectId);

    const now = new Date();
    const runtimeWindowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const usageWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const previousUsageWindowStart = new Date(
      now.getTime() - 2 * 24 * 60 * 60 * 1000,
    );

    const [
      runtimeDashboard,
      failedLeases,
      retryStates,
      releaseRuns,
      recentUsage,
      previousUsageAggregate,
    ] =
      await Promise.all([
        this.getRuntimeDashboard(projectId),
        this.prisma.workItemLease.count({
          where: {
            projectId,
            status: {
              in: ['EXPIRED', 'RECOVERED'],
            },
            updatedAt: {
              gte: runtimeWindowStart,
            },
          },
        }),
        this.prisma.workItemRetryState.findMany({
          where: {
            projectId,
            reviewFailureCount: {
              gte: 2,
            },
          },
          select: {
            reviewFailureCount: true,
          },
        }),
        this.prisma.releaseRun.count({
          where: {
            projectId,
            status: {
              in: ['FAILED', 'CANCELLED'],
            },
          },
        }),
        this.prisma.usageEvent.aggregate({
          where: {
            projectId,
            occurredAt: {
              gte: usageWindowStart,
              lte: now,
            },
          },
          _sum: {
            totalTokens: true,
          },
        }),
        this.prisma.usageEvent.aggregate({
          where: {
            projectId,
            occurredAt: {
              gte: previousUsageWindowStart,
              lt: usageWindowStart,
            },
          },
          _sum: {
            totalTokens: true,
          },
        }),
      ]);

    const offlineRuntimes = runtimeDashboard.items.filter(
      (item) => item.connectionStatus === 'offline',
    ).length;
    const repeatedReviewFailures = retryStates.reduce(
      (total, item) => total + item.reviewFailureCount,
      0,
    );
    const currentUsage = recentUsage._sum.totalTokens ?? 0;
    const previousUsage = previousUsageAggregate._sum.totalTokens ?? 0;
    const usageSpikeThreshold = previousUsage > 0 ? previousUsage * 2 : null;
    const hasUsageSpike =
      usageSpikeThreshold !== null ? currentUsage > usageSpikeThreshold : currentUsage > 0;

    return {
      projectId,
      generatedAt: now.toISOString(),
      items: [
        {
          name: 'runtimeOffline',
          value: offlineRuntimes,
          threshold: 0,
          status: offlineRuntimes > 0 ? 'warning' : 'ok',
          details: `${offlineRuntimes} runtimes are currently offline for this project context.`,
          observedAt: now.toISOString(),
        },
        {
          name: 'failedLease',
          value: failedLeases,
          threshold: 0,
          status: failedLeases > 0 ? 'warning' : 'ok',
          details: `${failedLeases} leases were recovered or expired in the last 7 days.`,
          observedAt: now.toISOString(),
        },
        {
          name: 'repeatedReviewFailure',
          value: repeatedReviewFailures,
          threshold: 0,
          status: repeatedReviewFailures > 0 ? 'warning' : 'ok',
          details: `${repeatedReviewFailures} accumulated repeated review failures are awaiting attention.`,
          observedAt: now.toISOString(),
        },
        {
          name: 'releaseFailure',
          value: releaseRuns,
          threshold: 0,
          status: releaseRuns > 0 ? 'warning' : 'ok',
          details: `${releaseRuns} release runs have failed or been cancelled.`,
          observedAt: now.toISOString(),
        },
        {
          name: 'usageSpike',
          value: currentUsage,
          threshold: usageSpikeThreshold,
          status: hasUsageSpike ? 'warning' : 'ok',
          details:
            usageSpikeThreshold === null
              ? `Current 24h token usage is ${currentUsage}. No prior baseline exists yet.`
              : `Current 24h token usage is ${currentUsage} against a spike threshold of ${usageSpikeThreshold}.`,
          observedAt: now.toISOString(),
        },
      ],
    };
  }

  public async updateProject(
    projectId: string,
    payload: UpdateProjectRequest,
  ): Promise<ProjectDetail> {
    await this.ensureProjectExists(projectId);
    const systemQueueLimits =
      await this.settingsService.getResolvedSystemQueueLimits();

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

    return mapProjectDetail(
      project,
      project.queueLimits ?? systemQueueLimits,
      await this.getKanbanCounts(projectId),
    );
  }

  public async getProjectQueueLimits(
    projectId: string,
  ): Promise<ProjectQueueLimitsSettingsResponse> {
    await this.ensureProjectExists(projectId);

    const [defaults, overrides] = await Promise.all([
      this.settingsService.getResolvedSystemQueueLimits(),
      this.prisma.projectQueueLimits.findUnique({
        where: { projectId },
      }),
    ]);

    return mapProjectQueueLimitsSettings(projectId, defaults, overrides);
  }

  public async getProjectAgentRouting(
    projectId: string,
  ): Promise<ProjectAgentRoutingSettingsResponse> {
    await this.ensureProjectExists(projectId);

    const [defaults, overrides] = await Promise.all([
      this.settingsService.getResolvedSystemAgentRouting(),
      this.prisma.projectAgentRouting.findUnique({
        where: { projectId },
      }),
    ]);

    return mapProjectAgentRoutingSettings(projectId, defaults, overrides);
  }

  public async upsertProjectAgentRouting(
    projectId: string,
    payload: AgentRoutingConfig,
  ): Promise<ProjectAgentRoutingSettingsResponse> {
    await this.ensureProjectExists(projectId);

    await this.prisma.projectAgentRouting.upsert({
      where: { projectId },
      create: {
        projectId,
        defaultProvider: payload.defaultProvider,
        defaultModel: payload.defaultModel,
        agentRoutesJson: toAgentRoutesJson(payload.agentRoutes),
      },
      update: {
        defaultProvider: payload.defaultProvider,
        defaultModel: payload.defaultModel,
        agentRoutesJson: toAgentRoutesJson(payload.agentRoutes),
      },
    });

    return this.getProjectAgentRouting(projectId);
  }

  public async clearProjectAgentRouting(
    projectId: string,
  ): Promise<ProjectAgentRoutingSettingsResponse> {
    await this.ensureProjectExists(projectId);

    await this.prisma.projectAgentRouting.deleteMany({
      where: { projectId },
    });

    return this.getProjectAgentRouting(projectId);
  }

  public async upsertProjectQueueLimits(
    projectId: string,
    payload: ProjectQueueLimits,
  ): Promise<ProjectQueueLimitsSettingsResponse> {
    await this.ensureProjectExists(projectId);

    await this.prisma.projectQueueLimits.upsert({
      where: { projectId },
      create: {
        projectId,
        ...payload,
      },
      update: payload,
    });

    return this.getProjectQueueLimits(projectId);
  }

  public async clearProjectQueueLimits(
    projectId: string,
  ): Promise<ProjectQueueLimitsSettingsResponse> {
    await this.ensureProjectExists(projectId);

    await this.prisma.projectQueueLimits.deleteMany({
      where: { projectId },
    });

    return this.getProjectQueueLimits(projectId);
  }

  public async resolveProjectAgentRoute(
    projectId: string,
    agentType: 'planning' | 'dev' | 'review' | 'release',
  ) {
    await this.ensureProjectExists(projectId);

    const [defaults, override] = await Promise.all([
      this.settingsService.getResolvedSystemAgentRouting(),
      this.prisma.projectAgentRouting.findUnique({
        where: { projectId },
      }),
    ]);
    const projectOverride = override ? mapPersistedAgentRouting(override) : null;

    const projectAgentRoute = projectOverride?.agentRoutes[agentType];

    if (projectAgentRoute) {
      return {
        projectId,
        agentType,
        provider: projectAgentRoute.provider,
        model: projectAgentRoute.model,
        source: 'project-agent' as const,
      };
    }

    if (projectOverride) {
      return {
        projectId,
        agentType,
        provider: projectOverride.defaultProvider,
        model: projectOverride.defaultModel,
        source: 'project-default' as const,
      };
    }

    const defaultAgentRoute = defaults.agentRoutes[agentType];

    if (defaultAgentRoute) {
      return {
        projectId,
        agentType,
        provider: defaultAgentRoute.provider,
        model: defaultAgentRoute.model,
        source: 'system-agent' as const,
      };
    }

    return {
      projectId,
      agentType,
      provider: defaults.defaultProvider,
      model: defaults.defaultModel,
      source: 'system-default' as const,
    };
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

  private async getKanbanCounts(projectId: string): Promise<KanbanBoardCounts> {
    const counts = createEmptyKanbanCounts();
    const workItems = await this.prisma.workItem.findMany({
      where: { projectId },
      select: { state: true },
    });

    for (const workItem of workItems) {
      switch (workItem.state) {
        case 'PLANNING':
          counts.planning += 1;
          break;
        case 'READY_FOR_DEV':
          counts.readyForDev += 1;
          break;
        case 'IN_DEV':
          counts.inDev += 1;
          break;
        case 'READY_FOR_REVIEW':
          counts.readyForReview += 1;
          break;
        case 'IN_REVIEW':
          counts.inReview += 1;
          break;
        case 'READY_FOR_RELEASE':
          counts.readyForRelease += 1;
          break;
        case 'REQUIRES_HUMAN_INTERVENTION':
          counts.requiresHumanIntervention += 1;
          break;
        case 'RELEASED':
          counts.released += 1;
          break;
      }
    }

    return counts;
  }
}
