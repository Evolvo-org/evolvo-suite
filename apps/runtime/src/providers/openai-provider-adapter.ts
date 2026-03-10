import type { ActiveAiAgentType } from '@repo/shared';

import type { RuntimeEnvironment } from '../config';
import type { RuntimeAgentModelRoute } from '../config/agent-model.config';

import type {
  ProviderCredentialStatus,
  RuntimeProviderAdapter,
} from './provider-adapter';

export class OpenAiProviderAdapter implements RuntimeProviderAdapter {
  public readonly provider = 'openai' as const;

  public getCredentialStatus(
    environment: RuntimeEnvironment,
  ): ProviderCredentialStatus {
    return {
      configured: Boolean(environment.openAiApiKey),
      missingEnvironmentVariables: environment.openAiApiKey
        ? []
        : ['OPENAI_API_KEY'],
    };
  }

  public assertConfigured(
    environment: RuntimeEnvironment,
    role: ActiveAiAgentType,
  ): void {
    const status = this.getCredentialStatus(environment);

    if (!status.configured) {
      throw new Error(
        `OpenAI provider is configured for role ${role} but OPENAI_API_KEY is missing.`,
      );
    }
  }

  public assertSupportedRoute(
    route: RuntimeAgentModelRoute,
    role: ActiveAiAgentType,
  ): void {
    if (route.provider !== this.provider) {
      throw new Error(
        `OpenAI adapter cannot validate provider ${route.provider} for role ${role}.`,
      );
    }

    if (route.model.trim().length === 0) {
      throw new Error(`OpenAI model is missing for role ${role}.`);
    }
  }
}