import type { ProjectQueueLimits } from './project-queue-limits';
import type { WorkItemPriority } from './planning-hierarchy';
import type { RuntimeConnectionStatus } from './project-status';
import type { ProjectRepositoryInput } from './projects';
import type { SchedulerLease, SchedulerLeaseLane } from './scheduler';
import type { WorkItemState } from './workflow';

export const runtimeHealthStatuses = ['idle', 'busy', 'degraded'] as const;
export const runtimeOfflineThresholdMs = 90_000;

export type RuntimeHealthStatus = (typeof runtimeHealthStatuses)[number];

export interface RegisterRuntimeRequest {
  runtimeId: string;
  displayName: string;
  capabilities?: string[];
}

export interface RuntimeHeartbeatRequest {
  status: RuntimeHealthStatus;
  activeJobSummary?: string;
  lastAction?: string;
  lastError?: string;
}

export interface RuntimeDetailResponse {
  runtimeId: string;
  displayName: string;
  connectionStatus: RuntimeConnectionStatus;
  reportedStatus: RuntimeHealthStatus;
  capabilities: string[];
  activeJobSummary: string | null;
  lastAction: string | null;
  lastError: string | null;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RuntimeDashboardFailure {
  id: string;
  workItemId: string | null;
  message: string | null;
  occurredAt: string;
}

export interface RuntimeDashboardItem {
  runtimeId: string;
  displayName: string;
  connectionStatus: RuntimeConnectionStatus;
  reportedStatus: RuntimeHealthStatus;
  capabilities: string[];
  heartbeatAgeSeconds: number;
  activeJobs: number;
  activeJobSummary: string | null;
  lastAction: string | null;
  lastError: string | null;
  lastSeenAt: string;
  recentFailures: RuntimeDashboardFailure[];
}

export interface RuntimeDashboardResponse {
  projectId: string;
  generatedAt: string;
  items: RuntimeDashboardItem[];
}

export interface RequestRuntimeWorkRequest {
  lanes?: SchedulerLeaseLane[];
  projectId?: string;
  leaseDurationSeconds?: number;
}

export interface RuntimeDispatchProject {
  id: string;
  name: string;
  slug: string;
  repository: ProjectRepositoryInput;
  queueLimits: ProjectQueueLimits;
}

export interface RuntimeDispatchWorkItem {
  id: string;
  epicId: string;
  epicTitle: string;
  title: string;
  description: string | null;
  state: WorkItemState;
  priority: WorkItemPriority;
  lane: SchedulerLeaseLane;
}

export interface RuntimeWorkDispatchResponse {
  lease: SchedulerLease | null;
  recoveredCount: number;
  project: RuntimeDispatchProject | null;
  workItem: RuntimeDispatchWorkItem | null;
}

export interface RuntimeProgressUpdateRequest {
  leaseToken: string;
  activeJobSummary?: string;
  lastAction?: string;
  progressPercent?: number;
  leaseDurationSeconds?: number;
}

export const runtimeJobOutcomes = ['completed', 'failed', 'cancelled'] as const;

export type RuntimeJobOutcome = (typeof runtimeJobOutcomes)[number];

export interface RuntimeJobResultRequest {
  leaseToken: string;
  outcome: RuntimeJobOutcome;
  nextState?: WorkItemState;
  summary?: string;
  errorMessage?: string;
}

export interface RuntimeJobResultResponse {
  lease: SchedulerLease;
  runtime: RuntimeDetailResponse;
  workItemId: string;
  state: WorkItemState;
}

export const runtimeArtifactTypes = [
  'log',
  'patch',
  'testReport',
  'buildOutput',
  'releaseNote',
  'other',
] as const;

export type RuntimeArtifactType = (typeof runtimeArtifactTypes)[number];

export interface RuntimeArtifactUploadMetadataRequest {
  leaseToken: string;
  artifactType: RuntimeArtifactType;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface RuntimeArtifactUploadMetadataResponse {
  artifactId: string;
  leaseId: string;
  runtimeId: string;
  artifactType: RuntimeArtifactType;
  fileName: string;
  contentType: string | null;
  sizeBytes: number | null;
  storageKey: string;
  uploadUrl: string | null;
  status: 'pending';
  createdAt: string;
}
