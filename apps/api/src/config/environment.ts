import { environmentSchema } from '@repo/validation';

export interface ApplicationEnvironment {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  databaseUrl: string;
  authSessionSecret: string;
  authSessionTtlSeconds: number;
  authDevLoginEnabled: boolean;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  billingAdminBypass: boolean;
  realtimeSocketToken: string;
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
    authSessionSecret: parsed.AUTH_SESSION_SECRET,
    authSessionTtlSeconds: parsed.AUTH_SESSION_TTL_SECONDS,
    authDevLoginEnabled: parsed.AUTH_DEV_LOGIN_ENABLED,
    stripeSecretKey: parsed.STRIPE_SECRET_KEY,
    stripeWebhookSecret: parsed.STRIPE_WEBHOOK_SECRET,
    billingAdminBypass: parsed.BILLING_ADMIN_BYPASS,
    realtimeSocketToken: parsed.REALTIME_SOCKET_TOKEN,
    logLevel: parsed.LOG_LEVEL,
  };
};
