export const schedulerLeaseLanes = ['planning', 'dev', 'review', 'release'] as const;

export type SchedulerLeaseLane = (typeof schedulerLeaseLanes)[number];

export const schedulerProjectSkipReasons = [
  'paused',
  'openIntervention',
  'queueCapReached',
  'missingPlanningContext',
] as const;

export type SchedulerProjectSkipReason =
  (typeof schedulerProjectSkipReasons)[number];

export const schedulerLeaseStatuses = [
  'active',
  'expired',
  'released',
  'recovered',
] as const;

export type SchedulerLeaseStatus = (typeof schedulerLeaseStatuses)[number];

export interface SchedulerLease {
  id: string;
  projectId: string;
  workItemId: string;
  workItemTitle: string;
  runtimeId: string;
  lane: SchedulerLeaseLane;
  status: SchedulerLeaseStatus;
  leaseToken: string;
  leasedAt: string;
  expiresAt: string;
  renewedAt: string | null;
  releasedAt: string | null;
  recoveredAt: string | null;
  recoveryReason: string | null;
}

export interface AcquireSchedulerLeaseRequest {
  runtimeId: string;
  lanes?: SchedulerLeaseLane[];
  projectId?: string;
  workItemId?: string;
  leaseDurationSeconds?: number;
}

export interface AcquireSchedulerLeaseResponse {
  lease: SchedulerLease | null;
  recoveredCount: number;
}

export interface RenewSchedulerLeaseRequest {
  runtimeId: string;
  leaseToken: string;
  leaseDurationSeconds?: number;
}

export interface RecoverSchedulerLeasesRequest {
  limit?: number;
}

export interface RecoverSchedulerLeasesResponse {
  recoveredCount: number;
  items: SchedulerLease[];
}

export interface SchedulerLaneCursor {
  lane: SchedulerLeaseLane;
  lastProjectId: string | null;
}

export interface SchedulerProjectLaneState {
  lane: SchedulerLeaseLane;
  readyCount: number;
  inProgressCount: number;
  activeLeaseCount: number;
  limit: number;
}

export interface SchedulerProjectState {
  projectId: string;
  projectName: string;
  lifecycleStatus: import('./project-status').ProjectLifecycleStatus;
  openInterventionCount: number;
  laneStates: SchedulerProjectLaneState[];
}

export interface SchedulerSkippedProject {
  projectId: string;
  projectName: string;
  reasons: SchedulerProjectSkipReason[];
}

export interface SchedulerLaneSummary {
  lane: SchedulerLeaseLane;
  readyCount: number;
  inProgressCount: number;
  activeLeaseCount: number;
}

export interface SchedulerStateResponse {
  projectId: string | null;
  generatedAt: string;
  cursors: SchedulerLaneCursor[];
  laneSummaries: SchedulerLaneSummary[];
  projects: SchedulerProjectState[];
  skippedProjects: SchedulerSkippedProject[];
}
