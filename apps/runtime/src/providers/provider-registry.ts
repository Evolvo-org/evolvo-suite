import { activeAiAgentTypes, type AgentProvider } from '@repo/shared';

import type { RuntimeEnvironment } from '../config';
import { agentModelConfig, type RuntimeAgentModelConfig } from '../config/agent-model.config';

import { CodexProviderAdapter } from './codex-provider-adapter';
import { OpenAiProviderAdapter } from './openai-provider-adapter';
import type { RuntimeProviderAdapter } from './provider-adapter';

const providerAdapters: Record<AgentProvider, RuntimeProviderAdapter> = {
  openai: new OpenAiProviderAdapter(),
  codex: new CodexProviderAdapter(),
};

export const resolveRuntimeProviderAdapter = (
  provider: AgentProvider,
): RuntimeProviderAdapter => {
  return providerAdapters[provider];
};

export const assertRuntimeProviderConfiguration = (input: {
  environment: RuntimeEnvironment;
  config?: RuntimeAgentModelConfig;
}): void => {
  const config = input.config ?? agentModelConfig;

  for (const role of activeAiAgentTypes) {
    const route = config[role];

    if (!route.enabled) {
      continue;
    }

    const adapter = resolveRuntimeProviderAdapter(route.provider);
    adapter.assertSupportedRoute(route, role);
    adapter.assertConfigured(input.environment, role);
  }
};

export const getRuntimeProviderCredentialSummary = (input: {
  environment: RuntimeEnvironment;
  config?: RuntimeAgentModelConfig;
}) => {
  const config = input.config ?? agentModelConfig;

  return Object.fromEntries(
    activeAiAgentTypes.map((role) => {
      const route = config[role];
      const adapter = resolveRuntimeProviderAdapter(route.provider);
      const status = adapter.getCredentialStatus(input.environment);

      return [
        role,
        {
          provider: route.provider,
          enabled: route.enabled,
          configured: route.enabled ? status.configured : false,
          missingEnvironmentVariables: route.enabled
            ? status.missingEnvironmentVariables
            : [],
        },
      ];
    }),
  );
};