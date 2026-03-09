import type { RuntimeInstance } from '@repo/db/client';
import type { RuntimeDetailResponse } from '@repo/shared';

const offlineThresholdMs = 90_000;

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
    now.getTime() - runtime.lastSeenAt.getTime() > offlineThresholdMs
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
