import { runtimeEnvironmentSchema } from '@repo/validation';

export interface RuntimeEnvironment {
  nodeEnv: 'development' | 'test' | 'production';
  runtimeId: string;
  runtimeDisplayName: string;
  runtimeCapabilities: string[];
  apiBaseUrl: string;
  apiAuthToken: string | null;
  apiRetryMaxAttempts: number;
  apiRetryBaseDelayMs: number;
  repositoriesRoot: string;
  heartbeatIntervalMs: number;
  workPollingEnabled: boolean;
  workPollIntervalMs: number;
  workPollIdleBackoffMs: number;
  workPollMaxBackoffMs: number;
  leaseProgressIntervalMs: number;
}

export const loadRuntimeEnvironment = (
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeEnvironment => {
  const parsed = runtimeEnvironmentSchema.parse(environment);

  return {
    nodeEnv: parsed.NODE_ENV,
    runtimeId: parsed.RUNTIME_ID,
    runtimeDisplayName: parsed.RUNTIME_DISPLAY_NAME ?? parsed.RUNTIME_ID,
    runtimeCapabilities: parsed.RUNTIME_CAPABILITIES.split(',')
      .map((value) => value.trim())
      .filter((value, index, items) => value.length > 0 && items.indexOf(value) === index),
    apiBaseUrl: parsed.API_BASE_URL,
    apiAuthToken: parsed.API_AUTH_TOKEN ?? null,
    apiRetryMaxAttempts: parsed.API_RETRY_MAX_ATTEMPTS,
    apiRetryBaseDelayMs: parsed.API_RETRY_BASE_DELAY_MS,
    repositoriesRoot: parsed.REPOSITORIES_ROOT,
    heartbeatIntervalMs: parsed.HEARTBEAT_INTERVAL_MS,
    workPollingEnabled: parsed.WORK_POLLING_ENABLED,
    workPollIntervalMs: parsed.WORK_POLL_INTERVAL_MS,
    workPollIdleBackoffMs: parsed.WORK_POLL_IDLE_BACKOFF_MS,
    workPollMaxBackoffMs: parsed.WORK_POLL_MAX_BACKOFF_MS,
    leaseProgressIntervalMs: parsed.LEASE_PROGRESS_INTERVAL_MS,
  };
};
