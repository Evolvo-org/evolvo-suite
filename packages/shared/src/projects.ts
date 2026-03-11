import type { ProjectQueueLimits } from './project-queue-limits';
import type {
  ProjectLifecycleStatus,
  ProjectRepositorySetupStatus,
  RuntimeConnectionStatus,
} from './project-status';

export interface ProjectRepositoryInput {
  provider: 'github';
  owner: string;
  name: string;
  url: string;
  defaultBranch: string;
  baseBranch: string;
}

export interface ProjectRepositoryConfigResponse {
  projectId: string;
  repository: ProjectRepositoryInput;
  updatedAt: string;
}

export interface ProjectRepositoryValidationResponse {
  provider: 'github';
  isValid: boolean;
  normalizedUrl: string;
  issues: string[];
  warnings: string[];
  inferredOwner: string | null;
  inferredName: string | null;
}

export interface CreateProjectRequest {
  name: string;
  repository: ProjectRepositoryInput;
  productDescription: string;
  developmentPlan?: string;
  queueLimits?: ProjectQueueLimits;
}

export interface UpdateProjectRequest {
  name?: string;
  repository?: ProjectRepositoryInput;
  queueLimits?: ProjectQueueLimits;
}

export interface ProjectListFilters {
  query?: string;
  lifecycleStatus?: ProjectLifecycleStatus;
}

export interface ProjectListItem {
  id: string;
  name: string;
  slug: string;
  lifecycleStatus: ProjectLifecycleStatus;
  repository: ProjectRepositoryInput;
  productSpecVersion: number | null;
  activePlanVersionNumber: number | null;
  runtimeStatus: RuntimeConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectOverviewMetrics {
  kanbanCounts: {
    planning: number;
    readyForDev: number;
    inDev: number;
    readyForReview: number;
    inReview: number;
    readyForRelease: number;
    requiresHumanIntervention: number;
    released: number;
  };
  runtimeStatus: RuntimeConnectionStatus;
  latestActivity: string[];
}

export interface ProjectRepositorySetupState {
  status: ProjectRepositorySetupStatus;
  message: string | null;
  errorMessage: string | null;
  updatedAt: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  lifecycleStatus: ProjectLifecycleStatus;
  repository: ProjectRepositoryInput;
  repositorySetup?: ProjectRepositorySetupState;
  queueLimits: ProjectQueueLimits;
  productSpecVersion: number | null;
  activePlanVersionNumber: number | null;
  metrics: ProjectOverviewMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStatusResponse {
  projectId: string;
  lifecycleStatus: ProjectLifecycleStatus;
  runtimeStatus: RuntimeConnectionStatus;
  updatedAt: string;
}
