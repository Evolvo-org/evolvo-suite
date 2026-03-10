import type {
  Project,
  ProjectAgentRouting,
  ProjectQueueLimits,
  ProjectRepository,
  ProductSpec,
  DevelopmentPlan,
  PlanVersion,
} from '@repo/db/client';
import type {
  AgentRoutingConfig,
  ProjectQueueLimits as SharedProjectQueueLimits,
  ProjectAgentRoutingSettingsResponse,
  ProjectQueueLimitsSettingsResponse,
  KanbanBoardCounts,
  ProjectDetail,
  ProjectListItem,
  ProjectRepositoryConfigResponse,
  ProjectStatusResponse,
} from '@repo/shared';

const emptyKanbanCounts = (): KanbanBoardCounts => ({
  planning: 0,
  readyForDev: 0,
  inDev: 0,
  readyForReview: 0,
  inReview: 0,
  readyForRelease: 0,
  requiresHumanIntervention: 0,
  released: 0,
});

export const mapRepository = (repository: ProjectRepository) => ({
  provider: 'github' as const,
  owner: repository.owner,
  name: repository.name,
  url: repository.url,
  defaultBranch: repository.defaultBranch,
  baseBranch: repository.baseBranch,
});

const mapPersistedQueueLimits = (
  queueLimits: ProjectQueueLimits,
): SharedProjectQueueLimits => ({
  maxPlanning: queueLimits.maxPlanning,
  maxReadyForDev: queueLimits.maxReadyForDev,
  maxInDev: queueLimits.maxInDev,
  maxReadyForReview: queueLimits.maxReadyForReview,
  maxInReview: queueLimits.maxInReview,
  maxReadyForRelease: queueLimits.maxReadyForRelease,
  maxReviewRetries: queueLimits.maxReviewRetries,
  maxMergeConflictRetries: queueLimits.maxMergeConflictRetries,
  maxRuntimeRetries: queueLimits.maxRuntimeRetries,
  maxAmbiguityRetries: queueLimits.maxAmbiguityRetries,
});

export const mapPersistedAgentRouting = (
  routing: Pick<ProjectAgentRouting, 'defaultProvider' | 'defaultModel' | 'agentRoutesJson'>,
): AgentRoutingConfig => ({
  defaultProvider: routing.defaultProvider as AgentRoutingConfig['defaultProvider'],
  defaultModel: routing.defaultModel,
  agentRoutes: (routing.agentRoutesJson as AgentRoutingConfig['agentRoutes'] | null) ?? {},
});

const mapLifecycleStatus = (value: Project['lifecycleStatus']) => {
  if (value === 'ACTIVE') {
    return 'active' as const;
  }

  if (value === 'PAUSED') {
    return 'paused' as const;
  }

  return 'draft' as const;
};

const mapActivePlanVersionNumber = (
  developmentPlan:
    | (DevelopmentPlan & { activeVersion: PlanVersion | null })
    | null,
): number | null => {
  return developmentPlan?.activeVersion?.versionNumber ?? null;
};

export const mapProjectListItem = (
  project: Project & {
    repository: ProjectRepository | null;
    productSpec: ProductSpec | null;
    developmentPlan:
      | (DevelopmentPlan & { activeVersion: PlanVersion | null })
      | null;
  },
): ProjectListItem => {
  if (!project.repository) {
    throw new Error(`Project ${project.id} is missing a repository record.`);
  }

  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    lifecycleStatus: mapLifecycleStatus(project.lifecycleStatus),
    repository: mapRepository(project.repository),
    productSpecVersion: project.productSpec?.version ?? null,
    activePlanVersionNumber: mapActivePlanVersionNumber(
      project.developmentPlan,
    ),
    runtimeStatus: 'offline',
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
};

export const mapProjectDetail = (
  project: Project & {
    repository: ProjectRepository | null;
    queueLimits: ProjectQueueLimits | null;
    productSpec: ProductSpec | null;
    developmentPlan:
      | (DevelopmentPlan & { activeVersion: PlanVersion | null })
      | null;
  },
  effectiveQueueLimits: SharedProjectQueueLimits,
  kanbanCounts: KanbanBoardCounts = emptyKanbanCounts(),
): ProjectDetail => {
  if (!project.repository) {
    throw new Error(`Project ${project.id} is missing a repository record.`);
  }

  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    lifecycleStatus: mapLifecycleStatus(project.lifecycleStatus),
    repository: mapRepository(project.repository),
    queueLimits: effectiveQueueLimits,
    productSpecVersion: project.productSpec?.version ?? null,
    activePlanVersionNumber: mapActivePlanVersionNumber(
      project.developmentPlan,
    ),
    metrics: {
      kanbanCounts,
      runtimeStatus: 'offline',
      latestActivity: [],
    },
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
};

export const mapProjectStatus = (project: Project): ProjectStatusResponse => ({
  projectId: project.id,
  lifecycleStatus: mapLifecycleStatus(project.lifecycleStatus),
  runtimeStatus: 'offline',
  updatedAt: project.updatedAt.toISOString(),
});

export const mapProjectRepositoryConfig = (
  projectId: string,
  repository: ProjectRepository,
): ProjectRepositoryConfigResponse => ({
  projectId,
  repository: mapRepository(repository),
  updatedAt: repository.updatedAt.toISOString(),
});

export const mapProjectQueueLimitsSettings = (
  projectId: string,
  defaults: SharedProjectQueueLimits,
  overrides: ProjectQueueLimits | null,
): ProjectQueueLimitsSettingsResponse => ({
  projectId,
  defaults,
  overrides: overrides ? mapPersistedQueueLimits(overrides) : null,
  effective: overrides ? mapPersistedQueueLimits(overrides) : defaults,
  updatedAt: overrides?.updatedAt.toISOString() ?? null,
});

export const mapProjectAgentRoutingSettings = (
  projectId: string,
  defaults: AgentRoutingConfig,
  overrides: ProjectAgentRouting | null,
): ProjectAgentRoutingSettingsResponse => ({
  projectId,
  defaults,
  overrides: overrides ? mapPersistedAgentRouting(overrides) : null,
  effective: overrides ? mapPersistedAgentRouting(overrides) : defaults,
  updatedAt: overrides?.updatedAt.toISOString() ?? null,
});
