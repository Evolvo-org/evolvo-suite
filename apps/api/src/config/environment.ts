import { environmentSchema } from '@repo/validation';

export interface ApplicationEnvironment {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  databaseUrl: string;
  logLevel: 'log' | 'error' | 'warn' | 'debug' | 'verbose';
}

export const validateEnvironment = (
  environment: Record<string, unknown>,
): ApplicationEnvironment => {
  const parsed = environmentSchema.parse(environment);

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    apiPrefix: parsed.API_PREFIX,
    corsOrigin: parsed.CORS_ORIGIN,
    databaseUrl: parsed.DATABASE_URL,
    logLevel: parsed.LOG_LEVEL,
  };
};
