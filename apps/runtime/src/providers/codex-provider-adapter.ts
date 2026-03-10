import type { ActiveAiAgentType } from '@repo/shared';

import type { RuntimeEnvironment } from '../config';
import type { RuntimeAgentModelRoute } from '../config/agent-model.config';

import type {
  ProviderCredentialStatus,
  RuntimeProviderAdapter,
} from './provider-adapter';

export class CodexProviderAdapter implements RuntimeProviderAdapter {
  public readonly provider = 'codex' as const;

  public getCredentialStatus(
    _environment: RuntimeEnvironment,
  ): ProviderCredentialStatus {
    return {
      configured: true,
      missingEnvironmentVariables: [],
    };
  }

  public assertConfigured(
    _environment: RuntimeEnvironment,
    _role: ActiveAiAgentType,
  ): void {}

  public assertSupportedRoute(
    route: RuntimeAgentModelRoute,
    role: ActiveAiAgentType,
  ): void {
    if (route.provider !== this.provider) {
      throw new Error(
        `Codex adapter cannot validate provider ${route.provider} for role ${role}.`,
      );
    }

    if (route.model.trim().length === 0) {
      throw new Error(`Codex model is missing for role ${role}.`);
    }
  }
}