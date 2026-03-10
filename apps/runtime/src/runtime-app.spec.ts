import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@repo/api-client';

import type { RuntimeEnvironment } from './config';
import * as agentModelConfigModule from './config/agent-model.config';
import { RuntimeApp } from './runtime-app';

describe('RuntimeApp', () => {
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

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('registers and sends startup, scheduled, and shutdown heartbeats', async () => {
    const runtimeApiClient = {
      registerRuntime: vi.fn().mockResolvedValue({
        runtimeId: environment.runtimeId,
        displayName: environment.runtimeDisplayName,
        connectionStatus: 'online',
        reportedStatus: 'idle',
        capabilities: environment.runtimeCapabilities,
        activeJobSummary: null,
        lastAction: null,
        lastError: null,
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      sendHeartbeat: vi.fn().mockResolvedValue({
        runtimeId: environment.runtimeId,
        displayName: environment.runtimeDisplayName,
        connectionStatus: 'online',
        reportedStatus: 'idle',
        capabilities: environment.runtimeCapabilities,
        activeJobSummary: null,
        lastAction: null,
        lastError: null,
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      requestWork: vi.fn(),
      requestWorktreeCleanup: vi.fn(),
      markWorktreeStale: vi.fn(),
      upsertWorktree: vi.fn(),
      listProjectWorktrees: vi.fn().mockResolvedValue({ projectId: 'p1', items: [] }),
    };

    const app = new RuntimeApp(
      environment,
      runtimeApiClient as never,
      { load: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) } as never,
      { ensureStorage: vi.fn().mockResolvedValue(undefined), getMetadataFilePath: vi.fn().mockReturnValue('/tmp/registry.json') } as never,
      {} as never,
      {} as never,
      {} as never,
      { reconcileOnStartup: vi.fn().mockResolvedValue(undefined) } as never,
    );

    await app.start();
    expect(runtimeApiClient.registerRuntime).toHaveBeenCalledOnce();
    expect(runtimeApiClient.sendHeartbeat).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(1000);
    expect(runtimeApiClient.sendHeartbeat).toHaveBeenCalledTimes(2);

    await app.stop('SIGTERM');
    expect(runtimeApiClient.sendHeartbeat).toHaveBeenCalledTimes(3);
  });

  it('keeps retrying runtime registration until the API becomes available', async () => {
    vi.useRealTimers();

    const runtimeApiClient = {
      registerRuntime: vi
        .fn()
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValue({
          runtimeId: environment.runtimeId,
          displayName: environment.runtimeDisplayName,
          connectionStatus: 'online',
          reportedStatus: 'idle',
          capabilities: environment.runtimeCapabilities,
          activeJobSummary: null,
          lastAction: null,
          lastError: null,
          lastSeenAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      sendHeartbeat: vi.fn().mockResolvedValue({
        runtimeId: environment.runtimeId,
        displayName: environment.runtimeDisplayName,
        connectionStatus: 'online',
        reportedStatus: 'idle',
        capabilities: environment.runtimeCapabilities,
        activeJobSummary: null,
        lastAction: null,
        lastError: null,
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      requestWork: vi.fn(),
      requestWorktreeCleanup: vi.fn(),
      markWorktreeStale: vi.fn(),
      upsertWorktree: vi.fn(),
      listProjectWorktrees: vi.fn().mockResolvedValue({ projectId: 'p1', items: [] }),
    };

    const app = new RuntimeApp(
      environment,
      runtimeApiClient as never,
      { load: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) } as never,
      { ensureStorage: vi.fn().mockResolvedValue(undefined), getMetadataFilePath: vi.fn().mockReturnValue('/tmp/registry.json') } as never,
      {} as never,
      {} as never,
      {} as never,
      { reconcileOnStartup: vi.fn().mockResolvedValue(undefined) } as never,
    );

    const startPromise = app.start();

    await startPromise;

    expect(runtimeApiClient.registerRuntime).toHaveBeenCalledTimes(2);
    expect(runtimeApiClient.sendHeartbeat).toHaveBeenCalledOnce();

    await app.stop('SIGTERM');
  }, 2_000);

  it('fails fast on non-retryable registration errors', async () => {
    const runtimeApiClient = {
      registerRuntime: vi
        .fn()
        .mockRejectedValue(new ApiClientError('Bad request.', 400)),
      sendHeartbeat: vi.fn(),
      requestWork: vi.fn(),
      requestWorktreeCleanup: vi.fn(),
      markWorktreeStale: vi.fn(),
      upsertWorktree: vi.fn(),
      listProjectWorktrees: vi.fn().mockResolvedValue({ projectId: 'p1', items: [] }),
    };

    const app = new RuntimeApp(
      environment,
      runtimeApiClient as never,
      { load: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) } as never,
      { ensureStorage: vi.fn().mockResolvedValue(undefined), getMetadataFilePath: vi.fn().mockReturnValue('/tmp/registry.json') } as never,
      {} as never,
      {} as never,
      {} as never,
      { reconcileOnStartup: vi.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(app.start()).rejects.toThrow('Bad request.');
    expect(runtimeApiClient.registerRuntime).toHaveBeenCalledOnce();
  });

  it('fails fast when runtime model config validation fails at startup', async () => {
    vi.spyOn(agentModelConfigModule, 'assertValidAgentModelConfig').mockImplementation(
      () => {
        throw new Error('Missing runtime agent model config for role dev.');
      },
    );

    const runtimeApiClient = {
      registerRuntime: vi.fn(),
      sendHeartbeat: vi.fn(),
      requestWork: vi.fn(),
      requestWorktreeCleanup: vi.fn(),
      markWorktreeStale: vi.fn(),
      upsertWorktree: vi.fn(),
      listProjectWorktrees: vi.fn().mockResolvedValue({ projectId: 'p1', items: [] }),
    };

    const app = new RuntimeApp(
      environment,
      runtimeApiClient as never,
      { load: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) } as never,
      { ensureStorage: vi.fn().mockResolvedValue(undefined), getMetadataFilePath: vi.fn().mockReturnValue('/tmp/registry.json') } as never,
      {} as never,
      {} as never,
      {} as never,
      { reconcileOnStartup: vi.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(app.start()).rejects.toThrow(
      'Missing runtime agent model config for role dev.',
    );
    expect(runtimeApiClient.registerRuntime).not.toHaveBeenCalled();
  });

  it('starts when codex is configured without a dedicated API key', async () => {
    const runtimeApiClient = {
      registerRuntime: vi.fn().mockResolvedValue({
        runtimeId: environment.runtimeId,
        displayName: environment.runtimeDisplayName,
        connectionStatus: 'online',
        reportedStatus: 'idle',
        capabilities: environment.runtimeCapabilities,
        activeJobSummary: null,
        lastAction: null,
        lastError: null,
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      sendHeartbeat: vi.fn().mockResolvedValue({
        runtimeId: environment.runtimeId,
        displayName: environment.runtimeDisplayName,
        connectionStatus: 'online',
        reportedStatus: 'idle',
        capabilities: environment.runtimeCapabilities,
        activeJobSummary: null,
        lastAction: null,
        lastError: null,
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      requestWork: vi.fn(),
      requestWorktreeCleanup: vi.fn(),
      markWorktreeStale: vi.fn(),
      upsertWorktree: vi.fn(),
      listProjectWorktrees: vi.fn().mockResolvedValue({ projectId: 'p1', items: [] }),
    };

    const app = new RuntimeApp(
      {
        ...environment,
        codexApiKey: null,
      },
      runtimeApiClient as never,
      { load: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) } as never,
      { ensureStorage: vi.fn().mockResolvedValue(undefined), getMetadataFilePath: vi.fn().mockReturnValue('/tmp/registry.json') } as never,
      {} as never,
      {} as never,
      {} as never,
      { reconcileOnStartup: vi.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(app.start()).resolves.toBeUndefined();
    expect(runtimeApiClient.registerRuntime).toHaveBeenCalledOnce();
    await app.stop('SIGTERM');
  });

  it('executes leased dev work and submits the resulting state transition', async () => {
    const runtimeApiClient = {
      registerRuntime: vi.fn(),
      sendHeartbeat: vi.fn(),
      requestWork: vi.fn(),
      requestWorktreeCleanup: vi.fn(),
      markWorktreeStale: vi.fn(),
      upsertWorktree: vi.fn().mockResolvedValue({
        id: 'tree-1',
        path: '/tmp/evolvo-runtime-tests/evolvo-suite/dev-work-1',
        branchName: 'dev/work-1-queue-dashboard',
      }),
      executeDevTask: vi.fn().mockResolvedValue({
        projectId: 'project-1',
        workItemId: 'work-1',
        route: {
          projectId: 'project-1',
          agentType: 'dev',
          provider: 'openai',
          model: 'gpt-5.4-mini',
          source: 'system-agent',
        },
        input: {
          agentType: 'dev',
          projectId: 'project-1',
          workItemId: 'work-1',
          goal: 'Implement queue dashboard',
          context: [],
          metadata: {},
        },
        runId: 'run-1',
        usageEventId: 'usage-1',
        worktreeId: 'tree-1',
        worktreePath: '/tmp/evolvo-runtime-tests/evolvo-suite/dev-work-1',
        branchName: 'dev/work-1-queue-dashboard',
        headSha: 'abc123runtime',
        artifactLabels: ['Implementation patch', 'Execution checks'],
        checks: [],
        nextState: 'readyForReview',
        comment: 'Dev agent completed execution.',
      }),
      submitJobResult: vi.fn().mockResolvedValue({
        lease: { id: 'lease-1' },
        runtime: { runtimeId: environment.runtimeId },
        workItemId: 'work-1',
        state: 'readyForReview',
      }),
      listProjectWorktrees: vi.fn().mockResolvedValue({ projectId: 'p1', items: [] }),
    };

    const localRepoRegistry = {
      ensureStorage: vi.fn().mockResolvedValue(undefined),
      getMetadataFilePath: vi.fn().mockReturnValue('/tmp/registry.json'),
      upsertProject: vi.fn().mockResolvedValue(undefined),
    };
    const branchManager = {
      createBranchName: vi.fn().mockReturnValue('dev/work-1-queue-dashboard'),
      getBaseBranch: vi.fn().mockReturnValue('main'),
      ensureWorkItemBranch: vi.fn().mockResolvedValue(undefined),
      getCleanupCandidates: vi.fn().mockResolvedValue([]),
    };
    const repoSyncService = {
      ensureProjectRepository: vi.fn().mockResolvedValue({
        localPath: '/tmp/evolvo-runtime-tests/repos/evolvo-suite',
      }),
    };
    const worktreeManager = {
      ensureWorktree: vi.fn().mockResolvedValue({
        path: '/tmp/evolvo-runtime-tests/evolvo-suite/dev-work-1',
        branchName: 'dev/work-1-queue-dashboard',
        baseBranch: 'main',
        headSha: 'abc123runtime',
        isDirty: false,
      }),
    };

    const app = new RuntimeApp(
      environment,
      runtimeApiClient as never,
      { load: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) } as never,
      localRepoRegistry as never,
      branchManager as never,
      repoSyncService as never,
      worktreeManager as never,
      { reconcileOnStartup: vi.fn().mockResolvedValue(undefined) } as never,
    );

    await (app as unknown as { handleLeasedWork(dispatch: unknown): Promise<void> }).handleLeasedWork({
      lease: {
        id: 'lease-1',
        projectId: 'project-1',
        workItemId: 'work-1',
        workItemTitle: 'Implement queue dashboard',
        lane: 'dev',
        leaseToken: 'lease-token-1',
        leasedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
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
        id: 'work-1',
        epicId: 'epic-1',
        epicTitle: 'Operations',
        title: 'Implement queue dashboard',
        description: 'Build a queue dashboard.',
        state: 'readyForDev',
        priority: 'high',
        lane: 'dev',
      },
    });

    expect(runtimeApiClient.executeDevTask).toHaveBeenCalledWith({
      projectId: 'project-1',
      workItemId: 'work-1',
      payload: {
        runtimeId: environment.runtimeId,
        leaseId: 'lease-1',
        worktreePath: '/tmp/evolvo-runtime-tests/evolvo-suite/dev-work-1',
        branchName: 'dev/work-1-queue-dashboard',
        baseBranch: 'main',
        headSha: 'abc123runtime',
      },
    });
    expect(runtimeApiClient.submitJobResult).toHaveBeenCalledWith(
      environment.runtimeId,
      'lease-1',
      {
        leaseToken: 'lease-token-1',
        outcome: 'completed',
        nextState: 'readyForReview',
        summary: 'Dev agent completed execution.',
        errorMessage: undefined,
      },
    );
  });

  it('executes leased planning work without preparing a worktree', async () => {
    const planningExecutionService = {
      execute: vi.fn().mockResolvedValue({
        generatedResult: {
          systemPrompt: 'system prompt',
          userPrompt: 'user prompt',
          accepted: true,
          decisionSummary: 'Accepted because the idea aligns with the active plan.',
          epics: [
            {
              title: 'Queue dashboard',
              summary: 'Break the queue dashboard into execution-ready work.',
              tasks: [
                {
                  title: 'Define scope',
                  description: 'Define the operational dashboard scope.',
                  acceptanceCriteria: ['Dashboard scope documented'],
                  ambiguityNotes: [],
                },
              ],
            },
          ],
        },
        usage: {
          provider: 'openai',
          model: 'gpt-5.3-codex',
          inputTokens: 120,
          outputTokens: 80,
          totalTokens: 200,
        },
      }),
    };

    const runtimeApiClient = {
      registerRuntime: vi.fn(),
      sendHeartbeat: vi.fn(),
      requestWork: vi.fn(),
      requestWorktreeCleanup: vi.fn(),
      markWorktreeStale: vi.fn(),
      upsertWorktree: vi.fn(),
      createUsageEvent: vi.fn().mockResolvedValue({
        id: 'usage-runtime-0',
      }),
      executePlanning: vi.fn().mockResolvedValue({
        projectId: 'project-1',
        sourceWorkItemId: 'work-0',
        accepted: true,
        route: {
          projectId: 'project-1',
          agentType: 'planning',
          provider: 'openai',
          model: 'gpt-5.3-codex',
          source: 'system-agent',
        },
        input: {
          agentType: 'planning',
          projectId: 'project-1',
          workItemId: 'work-0',
          goal: 'Plan queue dashboard',
          context: [],
          metadata: {},
        },
        runId: 'run-0',
        usageEventId: 'usage-0',
        epicId: 'epic-0',
        epicTitle: 'Queue dashboard',
        epics: [
          {
            epicId: 'epic-0',
            title: 'Queue dashboard',
            taskIds: ['work-0'],
          },
        ],
        createdTaskIds: ['sub-0'],
        promotedToReadyForDevIds: [],
        comment: 'Planning agent accepted the idea and created executable work.',
        tasks: [
          {
            workItemId: 'work-0',
            epicId: 'epic-0',
            epicTitle: 'Queue dashboard',
            title: 'Define scope',
            state: 'planning',
            acceptanceCriteriaCount: 2,
          },
        ],
      }),
      submitJobResult: vi.fn().mockResolvedValue({
        lease: { id: 'lease-0' },
        runtime: { runtimeId: environment.runtimeId },
        workItemId: 'work-0',
        state: 'planning',
      }),
      listProjectWorktrees: vi.fn().mockResolvedValue({ projectId: 'p1', items: [] }),
    };

    const app = new RuntimeApp(
      environment,
      runtimeApiClient as never,
      { load: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) } as never,
      { ensureStorage: vi.fn().mockResolvedValue(undefined), getMetadataFilePath: vi.fn().mockReturnValue('/tmp/registry.json'), upsertProject: vi.fn().mockResolvedValue(undefined) } as never,
      {} as never,
      {} as never,
      {} as never,
      { reconcileOnStartup: vi.fn().mockResolvedValue(undefined) } as never,
      planningExecutionService as never,
    );

    await (app as unknown as { handleLeasedWork(dispatch: unknown): Promise<void> }).handleLeasedWork({
      lease: {
        id: 'lease-0',
        projectId: 'project-1',
        workItemId: 'work-0',
        workItemTitle: 'Plan queue dashboard',
        lane: 'planning',
        leaseToken: 'lease-token-0',
        leasedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
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
    });

    expect(runtimeApiClient.executePlanning).toHaveBeenCalledWith({
      projectId: 'project-1',
      workItemId: 'work-0',
      payload: {
        runtimeId: environment.runtimeId,
        leaseId: 'lease-0',
        generatedResult: {
          systemPrompt: 'system prompt',
          userPrompt: 'user prompt',
          accepted: true,
          decisionSummary: 'Accepted because the idea aligns with the active plan.',
          epics: [
            {
              title: 'Queue dashboard',
              summary: 'Break the queue dashboard into execution-ready work.',
              tasks: [
                {
                  title: 'Define scope',
                  description: 'Define the operational dashboard scope.',
                  acceptanceCriteria: ['Dashboard scope documented'],
                  ambiguityNotes: [],
                },
              ],
            },
          ],
        },
      },
    });
    expect(runtimeApiClient.createUsageEvent).toHaveBeenCalledWith({
      projectId: 'project-1',
      payload: {
        workItemId: 'work-0',
        agentRunId: 'run-0',
        runtimeId: environment.runtimeId,
        agentType: 'planning',
        provider: 'openai',
        model: 'gpt-5.3-codex',
        inputTokens: 120,
        outputTokens: 80,
        totalTokens: 200,
      },
    });
    expect(runtimeApiClient.submitJobResult).toHaveBeenCalledWith(
      environment.runtimeId,
      'lease-0',
      {
        leaseToken: 'lease-token-0',
        outcome: 'completed',
        nextState: 'planning',
        summary: 'Planning agent accepted the idea and created executable work.',
        errorMessage: undefined,
      },
    );
    expect(runtimeApiClient.upsertWorktree).not.toHaveBeenCalled();
  });

  it('executes leased review work and submits the resulting state transition', async () => {
    const runtimeApiClient = {
      registerRuntime: vi.fn(),
      sendHeartbeat: vi.fn(),
      requestWork: vi.fn(),
      requestWorktreeCleanup: vi.fn(),
      markWorktreeStale: vi.fn(),
      upsertWorktree: vi.fn().mockResolvedValue({
        id: 'tree-2',
        path: '/tmp/evolvo-runtime-tests/evolvo-suite/review-work-2',
        branchName: 'review/work-2-queue-dashboard',
      }),
      executeReview: vi.fn().mockResolvedValue({
        projectId: 'project-1',
        workItemId: 'work-2',
        route: {
          projectId: 'project-1',
          agentType: 'review',
          provider: 'openai',
          model: 'gpt-5.4',
          source: 'system-agent',
        },
        input: {
          agentType: 'review',
          projectId: 'project-1',
          workItemId: 'work-2',
          goal: 'Review queue dashboard',
          context: [],
          metadata: {},
        },
        runId: 'run-2',
        usageEventId: 'usage-2',
        reviewGateResult: {
          id: 'gate-1',
          projectId: 'project-1',
          workItemId: 'work-2',
          overallStatus: 'passed',
          summary: 'All gates passed.',
          checks: [],
          criteriaEvaluations: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        nextState: 'readyForRelease',
        passed: true,
        comment: 'Review agent approved the work item for release.',
      }),
      submitJobResult: vi.fn().mockResolvedValue({
        lease: { id: 'lease-2' },
        runtime: { runtimeId: environment.runtimeId },
        workItemId: 'work-2',
        state: 'readyForRelease',
      }),
      listProjectWorktrees: vi.fn().mockResolvedValue({ projectId: 'p1', items: [] }),
    };

    const app = new RuntimeApp(
      environment,
      runtimeApiClient as never,
      { load: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) } as never,
      { ensureStorage: vi.fn().mockResolvedValue(undefined), getMetadataFilePath: vi.fn().mockReturnValue('/tmp/registry.json'), upsertProject: vi.fn().mockResolvedValue(undefined) } as never,
      { createBranchName: vi.fn().mockReturnValue('review/work-2-queue-dashboard'), getBaseBranch: vi.fn().mockReturnValue('main'), ensureWorkItemBranch: vi.fn().mockResolvedValue(undefined), getCleanupCandidates: vi.fn().mockResolvedValue([]) } as never,
      { ensureProjectRepository: vi.fn().mockResolvedValue({ localPath: '/tmp/evolvo-runtime-tests/repos/evolvo-suite' }) } as never,
      { ensureWorktree: vi.fn().mockResolvedValue({ path: '/tmp/evolvo-runtime-tests/evolvo-suite/review-work-2', branchName: 'review/work-2-queue-dashboard', baseBranch: 'main', headSha: 'reviewsha', isDirty: false }) } as never,
      { reconcileOnStartup: vi.fn().mockResolvedValue(undefined) } as never,
    );

    await (app as unknown as { handleLeasedWork(dispatch: unknown): Promise<void> }).handleLeasedWork({
      lease: {
        id: 'lease-2',
        projectId: 'project-1',
        workItemId: 'work-2',
        workItemTitle: 'Review queue dashboard',
        lane: 'review',
        leaseToken: 'lease-token-2',
        leasedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
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
        id: 'work-2',
        epicId: 'epic-1',
        epicTitle: 'Operations',
        title: 'Review queue dashboard',
        description: 'Review the dashboard implementation.',
        state: 'readyForReview',
        priority: 'high',
        lane: 'review',
      },
    });

    expect(runtimeApiClient.executeReview).toHaveBeenCalledWith({
      projectId: 'project-1',
      workItemId: 'work-2',
      payload: {
        runtimeId: environment.runtimeId,
        leaseId: 'lease-2',
      },
    });
    expect(runtimeApiClient.submitJobResult).toHaveBeenCalledWith(
      environment.runtimeId,
      'lease-2',
      {
        leaseToken: 'lease-token-2',
        outcome: 'completed',
        nextState: 'readyForRelease',
        summary: 'Review agent approved the work item for release.',
        errorMessage: undefined,
      },
    );
  });

  it('executes leased release work and submits the resulting state transition', async () => {
    const runtimeApiClient = {
      registerRuntime: vi.fn(),
      sendHeartbeat: vi.fn(),
      requestWork: vi.fn(),
      requestWorktreeCleanup: vi.fn(),
      markWorktreeStale: vi.fn(),
      upsertWorktree: vi.fn().mockResolvedValue({
        id: 'tree-3',
        path: '/tmp/evolvo-runtime-tests/evolvo-suite/release-work-3',
        branchName: 'release/work-3-queue-dashboard',
      }),
      executeRelease: vi.fn().mockResolvedValue({
        projectId: 'project-1',
        workItemId: 'work-3',
        route: {
          projectId: 'project-1',
          agentType: 'release',
          provider: 'openai',
          model: 'gpt-5.4',
          source: 'system-agent',
        },
        input: {
          agentType: 'release',
          projectId: 'project-1',
          workItemId: 'work-3',
          goal: 'Release queue dashboard',
          context: [],
          metadata: {},
        },
        runId: 'run-3',
        usageEventId: 'usage-3',
        releaseRun: {
          id: 'release-run-1',
          projectId: 'project-1',
          workItemId: 'work-3',
          workItemTitle: 'Release queue dashboard',
          runtimeId: environment.runtimeId,
          leaseId: 'lease-3',
          worktreeId: 'tree-3',
          status: 'succeeded',
          summary: 'Release completed.',
          errorMessage: null,
          mergeCommitSha: 'mergesha',
          releaseUrl: 'https://example.test/release',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          version: null,
          note: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        interventionId: null,
        nextState: 'released',
        comment: 'Release agent released the work item successfully.',
      }),
      submitJobResult: vi.fn().mockResolvedValue({
        lease: { id: 'lease-3' },
        runtime: { runtimeId: environment.runtimeId },
        workItemId: 'work-3',
        state: 'released',
      }),
      listProjectWorktrees: vi.fn().mockResolvedValue({ projectId: 'p1', items: [] }),
    };

    const app = new RuntimeApp(
      environment,
      runtimeApiClient as never,
      { load: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) } as never,
      { ensureStorage: vi.fn().mockResolvedValue(undefined), getMetadataFilePath: vi.fn().mockReturnValue('/tmp/registry.json'), upsertProject: vi.fn().mockResolvedValue(undefined) } as never,
      { createBranchName: vi.fn().mockReturnValue('release/work-3-queue-dashboard'), getBaseBranch: vi.fn().mockReturnValue('main'), ensureWorkItemBranch: vi.fn().mockResolvedValue(undefined), getCleanupCandidates: vi.fn().mockResolvedValue([]) } as never,
      { ensureProjectRepository: vi.fn().mockResolvedValue({ localPath: '/tmp/evolvo-runtime-tests/repos/evolvo-suite' }) } as never,
      { ensureWorktree: vi.fn().mockResolvedValue({ path: '/tmp/evolvo-runtime-tests/evolvo-suite/release-work-3', branchName: 'release/work-3-queue-dashboard', baseBranch: 'main', headSha: 'releasesha', isDirty: false }) } as never,
      { reconcileOnStartup: vi.fn().mockResolvedValue(undefined) } as never,
    );

    await (app as unknown as { handleLeasedWork(dispatch: unknown): Promise<void> }).handleLeasedWork({
      lease: {
        id: 'lease-3',
        projectId: 'project-1',
        workItemId: 'work-3',
        workItemTitle: 'Release queue dashboard',
        lane: 'release',
        leaseToken: 'lease-token-3',
        leasedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
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
        id: 'work-3',
        epicId: 'epic-1',
        epicTitle: 'Operations',
        title: 'Release queue dashboard',
        description: 'Release the dashboard implementation.',
        state: 'readyForRelease',
        priority: 'high',
        lane: 'release',
      },
    });

    expect(runtimeApiClient.executeRelease).toHaveBeenCalledWith({
      projectId: 'project-1',
      workItemId: 'work-3',
      payload: {
        runtimeId: environment.runtimeId,
        leaseId: 'lease-3',
        outcome: 'success',
      },
    });
    expect(runtimeApiClient.submitJobResult).toHaveBeenCalledWith(
      environment.runtimeId,
      'lease-3',
      {
        leaseToken: 'lease-token-3',
        outcome: 'completed',
        nextState: 'released',
        summary: 'Release agent released the work item successfully.',
        errorMessage: undefined,
      },
    );
  });
});
