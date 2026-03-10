import { describe, expect, it, vi } from 'vitest';

import type { RuntimeEnvironment } from './config';
import { DevTaskSelectionService } from './dev-task-selection.service';

describe('DevTaskSelectionService', () => {
  const environment: RuntimeEnvironment = {
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
  };

  it('selects a ready-for-dev task from the candidate set', async () => {
    const runCodex = vi.fn().mockResolvedValue({
      rawText: JSON.stringify({
        projectId: 'project-1',
        workItemId: 'work-init',
        rationale: 'Repository initialization should happen before feature implementation.',
      }),
    });

    const service = new DevTaskSelectionService(environment, {
      runCodex,
    });

    const result = await service.chooseNextTask({
      candidates: [
        {
          projectId: 'project-1',
          projectName: 'TaskLite',
          workItemId: 'work-models',
          title: 'Create user models',
          description: 'Add the first domain models.',
          priority: 'high',
          dependencyIds: [],
        },
        {
          projectId: 'project-1',
          projectName: 'TaskLite',
          workItemId: 'work-init',
          title: 'Initialize repository structure',
          description: 'Set up the repo foundation and tooling.',
          priority: 'medium',
          dependencyIds: [],
        },
      ],
    });

    expect(runCodex).toHaveBeenCalledOnce();
    expect(result).toEqual({
      projectId: 'project-1',
      workItemId: 'work-init',
      rationale: 'Repository initialization should happen before feature implementation.',
    });
  });
});