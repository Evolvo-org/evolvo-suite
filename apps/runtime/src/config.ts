import { runtimeEnvironmentSchema } from '@repo/validation';

export interface RuntimeEnvironment {
  nodeEnv: 'development' | 'test' | 'production';
  runtimeId: string;
  apiBaseUrl: string;
  repositoriesRoot: string;
  heartbeatIntervalMs: number;
}

export const loadRuntimeEnvironment = (
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeEnvironment => {
  const parsed = runtimeEnvironmentSchema.parse(environment);

  return {
    nodeEnv: parsed.NODE_ENV,
    runtimeId: parsed.RUNTIME_ID,
    apiBaseUrl: parsed.API_BASE_URL,
    repositoriesRoot: parsed.REPOSITORIES_ROOT,
    heartbeatIntervalMs: parsed.HEARTBEAT_INTERVAL_MS,
  };
};
