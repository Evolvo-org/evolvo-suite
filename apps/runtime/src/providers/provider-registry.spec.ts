import { describe, expect, it } from 'vitest';

import type { RuntimeEnvironment } from '../config';
import { agentModelConfig } from '../config/agent-model.config';

import {
  assertRuntimeProviderConfiguration,
  getRuntimeProviderCredentialSummary,
  resolveRuntimeProviderAdapter,
} from './provider-registry';

const createEnvironment = (
  overrides: Partial<RuntimeEnvironment> = {},
): RuntimeEnvironment => ({
  nodeEnv: 'test',
  runtimeId: 'runtime-test',
  runtimeDisplayName: 'Runtime Test',
  runtimeCapabilities: ['git', 'leases', 'heartbeats'],
  openAiApiKey: 'openai-test-key',
  codexApiKey: 'codex-test-key',
  apiBaseUrl: 'http://localhost:3000/api/v1',
  apiAuthToken: null,
  apiRetryMaxAttempts: 1,
  apiRetryBaseDelayMs: 10,
  repositoriesRoot: '/tmp/evolvo-runtime-tests',
  heartbeatIntervalMs: 1000,
  workPollingEnabled: false,
  workPollIntervalMs: 1000,
  workPollIdleBackoffMs: 1000,
  workPollMaxBackoffMs: 5000,
  leaseProgressIntervalMs: 1000,
  ...overrides,
});

describe('provider-registry', () => {
  it('resolves provider adapters for the supported runtime providers', () => {
    expect(resolveRuntimeProviderAdapter('openai').provider).toBe('openai');
    expect(resolveRuntimeProviderAdapter('codex').provider).toBe('codex');
  });

  it('validates provider credentials for enabled routes', () => {
    expect(() =>
      assertRuntimeProviderConfiguration({
        environment: createEnvironment(),
      }),
    ).not.toThrow();
  });

  it('fails when an enabled openai route is missing its runtime secret', () => {
    expect(() =>
      assertRuntimeProviderConfiguration({
        environment: createEnvironment({ openAiApiKey: null }),
        config: {
          ...agentModelConfig,
          planning: {
            ...agentModelConfig.planning,
            provider: 'openai',
          },
        },
      }),
    ).toThrow('OpenAI provider is configured for role planning but OPENAI_API_KEY is missing.');
  });

  it('allows codex routes without a dedicated API key', () => {
    expect(() =>
      assertRuntimeProviderConfiguration({
        environment: createEnvironment({ codexApiKey: null }),
        config: {
          ...agentModelConfig,
          dev: {
            ...agentModelConfig.dev,
            provider: 'codex',
          },
        },
      }),
    ).not.toThrow();
  });

  it('reports credential status per enabled runtime role', () => {
    const summary = getRuntimeProviderCredentialSummary({
      environment: createEnvironment({ codexApiKey: null }),
    });

    expect(summary.planning?.configured).toBe(true);
    expect(summary.dev?.configured).toBe(true);
    expect(summary.dev?.missingEnvironmentVariables).toEqual([]);
  });
});