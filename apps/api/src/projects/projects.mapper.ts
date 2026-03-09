import type {
  Project,
  ProjectQueueLimits,
  ProjectRepository,
  ProductSpec,
  DevelopmentPlan,
  PlanVersion,
} from '@repo/db';
import { defaultProjectQueueLimits } from '@repo/shared';
import type {
  ProjectDetail,
  ProjectListItem,
  ProjectStatusResponse,
} from '@repo/shared';

const mapRepository = (repository: ProjectRepository) => ({
  provider: 'github' as const,
  owner: repository.owner,
  name: repository.name,
  url: repository.url,
  defaultBranch: repository.defaultBranch,
  baseBranch: repository.baseBranch,
});

const mapQueueLimits = (queueLimits: ProjectQueueLimits | null) => ({
  maxPlanning:
    queueLimits?.maxPlanning ?? defaultProjectQueueLimits.maxPlanning,
  maxReadyForDev:
    queueLimits?.maxReadyForDev ?? defaultProjectQueueLimits.maxReadyForDev,
  maxInDev: queueLimits?.maxInDev ?? defaultProjectQueueLimits.maxInDev,
  maxReadyForReview:
    queueLimits?.maxReadyForReview ??
    defaultProjectQueueLimits.maxReadyForReview,
  maxInReview:
    queueLimits?.maxInReview ?? defaultProjectQueueLimits.maxInReview,
  maxReadyForRelease:
    queueLimits?.maxReadyForRelease ??
    defaultProjectQueueLimits.maxReadyForRelease,
  maxReviewRetries:
    queueLimits?.maxReviewRetries ?? defaultProjectQueueLimits.maxReviewRetries,
  maxMergeConflictRetries:
    queueLimits?.maxMergeConflictRetries ??
    defaultProjectQueueLimits.maxMergeConflictRetries,
  maxRuntimeRetries:
    queueLimits?.maxRuntimeRetries ??
    defaultProjectQueueLimits.maxRuntimeRetries,
  maxAmbiguityRetries:
    queueLimits?.maxAmbiguityRetries ??
    defaultProjectQueueLimits.maxAmbiguityRetries,
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
    queueLimits: mapQueueLimits(project.queueLimits),
    productSpecVersion: project.productSpec?.version ?? null,
    activePlanVersionNumber: mapActivePlanVersionNumber(
      project.developmentPlan,
    ),
    metrics: {
      kanbanCounts: {
        inbox: 0,
        planning: 0,
        readyForDev: 0,
        inDev: 0,
        readyForReview: 0,
        inReview: 0,
        readyForRelease: 0,
        requiresHumanIntervention: 0,
        released: 0,
      },
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
