import { describe, expect, it } from 'vitest';

import {
  getAgentModelRoute,
  agentModelConfig,
  assertValidAgentModelConfig,
  getActiveAgentModelRoutingSummary,
} from './config/agent-model.config';

describe('agent-model.config', () => {
  it('validates the flat runtime model config for all active AI roles', () => {
    expect(() => assertValidAgentModelConfig(agentModelConfig)).not.toThrow();

    const summary = getActiveAgentModelRoutingSummary();
    expect(summary.planning.model).toBe(agentModelConfig.planning.model);
    expect(summary.dev.model).toBe(agentModelConfig.dev.model);
    expect(summary.review.provider).toBe(agentModelConfig.review.provider);
    expect(summary.release.provider).toBe(agentModelConfig.release.provider);
  });

  it('rejects invalid role config entries', () => {
    expect(() =>
      assertValidAgentModelConfig({
        ...agentModelConfig,
        dev: {
          ...agentModelConfig.dev,
          model: '   ',
        },
      }),
    ).toThrow('Missing model name configured for role dev.');
  });

  it('resolves provider and model config for each active runtime role', () => {
    expect(getAgentModelRoute('planning')).toEqual(agentModelConfig.planning);
    expect(getAgentModelRoute('dev')).toEqual(agentModelConfig.dev);
    expect(getAgentModelRoute('review')).toEqual(agentModelConfig.review);
    expect(getAgentModelRoute('release')).toEqual(agentModelConfig.release);
  });
});