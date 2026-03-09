import type { RuntimeConnectionStatus } from './project-status';

export const runtimeHealthStatuses = ['idle', 'busy', 'degraded'] as const;

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
