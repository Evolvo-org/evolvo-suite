import type {
  RuntimeArtifact,
  RuntimeArtifactType as PrismaRuntimeArtifactType,
  RuntimeInstance,
  WorkItem,
} from '@repo/db/client';
import type {
  RuntimeArtifactUploadMetadataResponse,
  RuntimeDetailResponse,
  RuntimeDispatchProject,
  RuntimeDispatchWorkItem,
} from '@repo/shared';
import { runtimeOfflineThresholdMs } from '@repo/shared';

const mapReportedStatus = (
  value: RuntimeInstance['status'],
): RuntimeDetailResponse['reportedStatus'] => {
  switch (value) {
    case 'BUSY':
      return 'busy';
    case 'DEGRADED':
      return 'degraded';
    default:
      return 'idle';
  }
};

export const mapRuntimeDetail = (
  runtime: RuntimeInstance,
  now = new Date(),
): RuntimeDetailResponse => ({
  runtimeId: runtime.id,
  displayName: runtime.displayName,
  connectionStatus:
    now.getTime() - runtime.lastSeenAt.getTime() > runtimeOfflineThresholdMs
      ? 'offline'
      : 'online',
  reportedStatus: mapReportedStatus(runtime.status),
  capabilities: runtime.capabilities,
  activeJobSummary: runtime.activeJobSummary ?? null,
  lastAction: runtime.lastAction ?? null,
  lastError: runtime.lastError ?? null,
  lastSeenAt: runtime.lastSeenAt.toISOString(),
  createdAt: runtime.createdAt.toISOString(),
  updatedAt: runtime.updatedAt.toISOString(),
});

const mapWorkItemState = (
  value: WorkItem['state'],
): RuntimeDispatchWorkItem['state'] => {
  switch (value) {
    case 'PLANNING':
      return 'planning';
    case 'READY_FOR_DEV':
      return 'readyForDev';
    case 'IN_DEV':
      return 'inDev';
    case 'READY_FOR_REVIEW':
      return 'readyForReview';
    case 'IN_REVIEW':
      return 'inReview';
    case 'READY_FOR_RELEASE':
      return 'readyForRelease';
    case 'REQUIRES_HUMAN_INTERVENTION':
      return 'requiresHumanIntervention';
    case 'RELEASED':
      return 'released';
    default:
      return 'planning';
  }
};

const mapPriority = (
  value: WorkItem['priority'],
): RuntimeDispatchWorkItem['priority'] => {
  switch (value) {
    case 'LOW':
      return 'low';
    case 'HIGH':
      return 'high';
    case 'URGENT':
      return 'urgent';
    default:
      return 'medium';
  }
};

const mapArtifactType = (
  value: PrismaRuntimeArtifactType,
): RuntimeArtifactUploadMetadataResponse['artifactType'] => {
  switch (value) {
    case 'LOG':
      return 'log';
    case 'PATCH':
      return 'patch';
    case 'TEST_REPORT':
      return 'testReport';
    case 'BUILD_OUTPUT':
      return 'buildOutput';
    case 'RELEASE_NOTE':
      return 'releaseNote';
    default:
      return 'other';
  }
};

export const mapRuntimeDispatchProject = (
  project: RuntimeDispatchProject,
): RuntimeDispatchProject => ({
  ...project,
  repository: {
    ...project.repository,
  },
  queueLimits: {
    ...project.queueLimits,
  },
});

export const mapRuntimeDispatchWorkItem = (
  workItem: WorkItem & { epic: { title: string } },
  lane: RuntimeDispatchWorkItem['lane'],
): RuntimeDispatchWorkItem => ({
  id: workItem.id,
  epicId: workItem.epicId,
  epicTitle: workItem.epic.title,
  title: workItem.title,
  description: workItem.description ?? null,
  state: mapWorkItemState(workItem.state),
  priority: mapPriority(workItem.priority),
  lane,
});

export const mapRuntimeArtifactUploadMetadata = (
  artifact: RuntimeArtifact,
): RuntimeArtifactUploadMetadataResponse => ({
  artifactId: artifact.id,
  leaseId: artifact.leaseId,
  runtimeId: artifact.runtimeId,
  artifactType: mapArtifactType(artifact.artifactType),
  fileName: artifact.fileName,
  contentType: artifact.contentType ?? null,
  sizeBytes: artifact.sizeBytes ?? null,
  storageKey: artifact.storageKey,
  uploadUrl: null,
  status: 'pending',
  createdAt: artifact.createdAt.toISOString(),
});
