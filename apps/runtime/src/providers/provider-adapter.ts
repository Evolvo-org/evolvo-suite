import type { AgentProvider, ActiveAiAgentType } from '@repo/shared';

import type { RuntimeEnvironment } from '../config';
import type { RuntimeAgentModelRoute } from '../config/agent-model.config';

export interface ProviderCredentialStatus {
  configured: boolean;
  missingEnvironmentVariables: string[];
}

export interface RuntimeProviderAdapter {
  provider: AgentProvider;
  getCredentialStatus(environment: RuntimeEnvironment): ProviderCredentialStatus;
  assertConfigured(
    environment: RuntimeEnvironment,
    role: ActiveAiAgentType,
  ): void;
  assertSupportedRoute(route: RuntimeAgentModelRoute, role: ActiveAiAgentType): void;
}