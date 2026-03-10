import {
  activeAiAgentTypes,
  agentProviders,
  type ActiveAiAgentType,
  type AgentProvider,
} from '@repo/shared';

export interface RuntimeAgentModelRoute {
  provider: AgentProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  maxRetries: number;
  enabled: boolean;
}

export type RuntimeAgentModelConfig = Record<
  ActiveAiAgentType,
  RuntimeAgentModelRoute
>;

export const agentModelConfig: RuntimeAgentModelConfig = {
  planning: {
    provider: 'openai',
    model: 'gpt-5.3-codex',
    temperature: 0.1,
    maxTokens: 12000,
    timeoutMs: 120000,
    maxRetries: 1,
    enabled: true,
  },
  dev: {
    provider: 'codex',
    model: 'gpt-5.4',
    temperature: 0.1,
    maxTokens: 16000,
    timeoutMs: 180000,
    maxRetries: 1,
    enabled: true,
  },
  review: {
    provider: 'openai',
    model: 'gpt-5.3-codex',
    temperature: 0.1,
    maxTokens: 12000,
    timeoutMs: 120000,
    maxRetries: 1,
    enabled: true,
  },
  release: {
    provider: 'openai',
    model: 'gpt-5.3-codex',
    temperature: 0.1,
    maxTokens: 12000,
    timeoutMs: 120000,
    maxRetries: 1,
    enabled: true,
  },
};

export const getAgentModelRoute = (
  role: ActiveAiAgentType,
): RuntimeAgentModelRoute => {
  return agentModelConfig[role];
};

export const assertValidAgentModelConfig = (
  config: RuntimeAgentModelConfig = agentModelConfig,
): void => {
  for (const role of activeAiAgentTypes) {
    const route = config[role];

    if (!route) {
      throw new Error(`Missing runtime agent model config for role ${role}.`);
    }

    if (!agentProviders.includes(route.provider)) {
      throw new Error(
        `Invalid provider ${String(route.provider)} configured for role ${role}.`,
      );
    }

    if (route.model.trim().length === 0) {
      throw new Error(`Missing model name configured for role ${role}.`);
    }

    if (!Number.isFinite(route.temperature) || route.temperature < 0) {
      throw new Error(`Invalid temperature configured for role ${role}.`);
    }

    if (!Number.isInteger(route.maxTokens) || route.maxTokens <= 0) {
      throw new Error(`Invalid maxTokens configured for role ${role}.`);
    }

    if (!Number.isInteger(route.timeoutMs) || route.timeoutMs <= 0) {
      throw new Error(`Invalid timeoutMs configured for role ${role}.`);
    }

    if (!Number.isInteger(route.maxRetries) || route.maxRetries < 0) {
      throw new Error(`Invalid maxRetries configured for role ${role}.`);
    }
  }
};

export const getActiveAgentModelRoutingSummary = () => {
  assertValidAgentModelConfig();

  return Object.fromEntries(
    Object.entries(agentModelConfig).map(([role, config]) => [
      role,
      {
        provider: config.provider,
        model: config.model,
        enabled: config.enabled,
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
      },
    ]),
  ) as Record<
    ActiveAiAgentType,
    Pick<
      RuntimeAgentModelRoute,
      'provider' | 'model' | 'enabled' | 'timeoutMs' | 'maxRetries'
    >
  >;
};