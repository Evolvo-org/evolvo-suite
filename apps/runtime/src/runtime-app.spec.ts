import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RuntimeEnvironment } from './config';
import { RuntimeApp } from './runtime-app';

describe('RuntimeApp', () => {
  const environment: RuntimeEnvironment = {
    nodeEnv: 'test',
    runtimeId: 'runtime-test',
    runtimeDisplayName: 'Runtime Test',
    runtimeCapabilities: ['git', 'leases', 'heartbeats'],
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
});