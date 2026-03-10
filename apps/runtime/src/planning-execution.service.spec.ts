import { describe, expect, it, vi } from 'vitest';

import type { RuntimeEnvironment } from './config';
import { PlanningExecutionService } from './planning-execution.service';

describe('PlanningExecutionService', () => {
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

  it('builds a generated planning result and usage payload from provider output', async () => {
    const runOpenAi = vi.fn().mockResolvedValue({
      rawText: JSON.stringify({
        accepted: true,
        decisionSummary: 'Accepted because the dashboard work is aligned with the current roadmap.',
        epics: [
          {
            title: 'Queue dashboard rollout',
            summary: 'Prepare the dashboard scope, data contract, and UI plan.',
            tasks: [
              {
                title: 'Define operational scope',
                description: 'Describe the dashboard audience and key metrics.',
                acceptanceCriteria: ['Audience is named', 'Metrics are enumerated'],
                ambiguityNotes: ['Confirm whether runtime lease backlog should be visible'],
              },
            ],
          },
        ],
      }),
      usage: {
        provider: 'openai',
        model: 'gpt-5.3-codex',
        inputTokens: 111,
        outputTokens: 222,
        totalTokens: 333,
      },
    });

    const service = new PlanningExecutionService(environment, {
      runOpenAi,
    });

    const result = await service.execute({
      dispatch: {
        lease: {
          id: 'lease-0',
          projectId: 'project-1',
          workItemId: 'work-0',
          runtimeId: 'runtime-1',
          workItemTitle: 'Plan queue dashboard',
          lane: 'planning',
          status: 'active',
          leaseToken: 'lease-token-0',
          leasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          renewedAt: null,
          releasedAt: null,
          recoveredAt: null,
          recoveryReason: null,
        },
        recoveredCount: 0,
        project: {
          id: 'project-1',
          name: 'Evolvo Suite',
          slug: 'evolvo-suite',
          repository: {
            provider: 'github',
            owner: 'evolvo-org',
            name: 'evolvo-suite',
            url: 'https://github.com/evolvo-org/evolvo-suite',
            defaultBranch: 'main',
            baseBranch: 'main',
          },
          queueLimits: {
            maxPlanning: 1,
            maxReadyForDev: 1,
            maxInDev: 1,
            maxReadyForReview: 1,
            maxInReview: 1,
            maxReadyForRelease: 1,
            maxReviewRetries: 1,
            maxMergeConflictRetries: 1,
            maxRuntimeRetries: 1,
            maxAmbiguityRetries: 1,
          },
        },
        workItem: {
          id: 'work-0',
          epicId: 'epic-planning',
          epicTitle: 'Planning requests',
          title: 'Plan queue dashboard',
          description: 'Expand the planning request into executable work.',
          state: 'planning',
          priority: 'high',
          lane: 'planning',
        },
        planningContext: {
          route: {
            projectId: 'project-1',
            agentType: 'planning',
            provider: 'openai',
            model: 'gpt-5.3-codex',
            source: 'system-agent',
          },
          productSpecId: 'spec-1',
          productSpecVersion: 2,
          productSpecContent: 'Queue work should become executable subtasks after planning approval.',
          developmentPlanId: 'plan-1',
          developmentPlanTitle: 'v2.1 backlog',
          developmentPlanVersionNumber: 1,
          developmentPlanContent: 'Complete runtime-owned planning execution.',
          duplicateWorkItemId: null,
          duplicateWorkItemTitle: null,
        },
      },
    });

    expect(runOpenAi).toHaveBeenCalledOnce();
    expect(result.generatedResult.accepted).toBe(true);
    expect(result.generatedResult.epics).toHaveLength(1);
    expect(result.generatedResult.epics[0]?.title).toBe('Queue dashboard rollout');
    expect(result.generatedResult.epics[0]?.tasks[0]?.title).toBe('Define operational scope');
    expect(result.usage).toEqual({
      provider: 'openai',
      model: 'gpt-5.3-codex',
      inputTokens: 111,
      outputTokens: 222,
      totalTokens: 333,
    });
  });

  it('rejects invalid accepted results that omit generated tasks', async () => {
    const service = new PlanningExecutionService(environment, {
      runOpenAi: vi.fn().mockResolvedValue({
        rawText: JSON.stringify({
          accepted: true,
          decisionSummary: 'Accepted but missing task expansion.',
          epics: [],
        }),
        usage: null,
      }),
    });

    await expect(
      service.execute({
        dispatch: {
          lease: {
            id: 'lease-0',
            projectId: 'project-1',
            workItemId: 'work-0',
            runtimeId: 'runtime-1',
            workItemTitle: 'Plan queue dashboard',
            lane: 'planning',
            status: 'active',
            leaseToken: 'lease-token-0',
            leasedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            renewedAt: null,
            releasedAt: null,
            recoveredAt: null,
            recoveryReason: null,
          },
          recoveredCount: 0,
          project: {
            id: 'project-1',
            name: 'Evolvo Suite',
            slug: 'evolvo-suite',
            repository: {
              provider: 'github',
              owner: 'evolvo-org',
              name: 'evolvo-suite',
              url: 'https://github.com/evolvo-org/evolvo-suite',
              defaultBranch: 'main',
              baseBranch: 'main',
            },
            queueLimits: {
              maxPlanning: 1,
              maxReadyForDev: 1,
              maxInDev: 1,
              maxReadyForReview: 1,
              maxInReview: 1,
              maxReadyForRelease: 1,
              maxReviewRetries: 1,
              maxMergeConflictRetries: 1,
              maxRuntimeRetries: 1,
              maxAmbiguityRetries: 1,
            },
          },
          workItem: {
            id: 'work-0',
            epicId: 'epic-planning',
            epicTitle: 'Planning requests',
            title: 'Plan queue dashboard',
            description: 'Expand the planning request into executable work.',
            state: 'planning',
            priority: 'high',
            lane: 'planning',
          },
          planningContext: {
            route: {
              projectId: 'project-1',
              agentType: 'planning',
              provider: 'openai',
              model: 'gpt-5.3-codex',
              source: 'system-agent',
            },
            productSpecId: 'spec-1',
            productSpecVersion: 2,
            productSpecContent: 'Queue work should become executable subtasks after planning approval.',
            developmentPlanId: 'plan-1',
            developmentPlanTitle: 'v2.1 backlog',
            developmentPlanVersionNumber: 1,
            developmentPlanContent: 'Complete runtime-owned planning execution.',
            duplicateWorkItemId: null,
            duplicateWorkItemTitle: null,
          },
        },
      }),
    ).rejects.toThrow('Accepted planning results must include at least one epic.');
  });
});