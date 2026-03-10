import { mkdir } from 'node:fs/promises';
import { ApiClientError } from '@repo/api-client';
import type {
  RuntimeDetailResponse,
  RuntimeHealthStatus,
  RuntimeWorkDispatchResponse,
  SchedulerLease,
  WorktreeResponse,
} from '@repo/shared';

import type { RuntimeEnvironment } from './config';
import {
  assertValidAgentModelConfig,
  getActiveAgentModelRoutingSummary,
} from './config/agent-model.config';
import { log } from './logger';
import {
  assertRuntimeProviderConfiguration,
  getRuntimeProviderCredentialSummary,
} from './providers/provider-registry';
import { BranchManager } from './branch-manager';
import { LocalRepoRegistry } from './repo-registry';
import { RecoveryService } from './recovery-service';
import { RepoSyncService } from './repo-sync';
import { RuntimeApiClient } from './runtime-api-client';
import { PlanningExecutionService } from './planning-execution.service';
import {
  type PersistedRuntimeIdentity,
  RuntimeIdentityStore,
} from './runtime-identity-store';
import { WorktreeManager } from './worktree-manager';

const sleep = async (durationMs: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

export class RuntimeApp {
  private isStopping = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private workPollTimer: NodeJS.Timeout | null = null;
  private leaseProgressTimer: NodeJS.Timeout | null = null;
  private heartbeatInFlight = false;
  private workPollInFlight = false;
  private registeredIdentity: RuntimeDetailResponse | null = null;
  private currentStatus: RuntimeHealthStatus = 'idle';
  private activeJobSummary: string | null = null;
  private lastAction = 'Runtime startup complete.';
  private lastError: string | null = null;
  private idleBackoffMs = 0;
  private activeLeaseContext: {
    lease: SchedulerLease;
    abortController: AbortController;
    receivedAt: string;
    branchName?: string;
    worktree?: WorktreeResponse;
    repositoryPath?: string;
  } | null = null;

  public constructor(
    private readonly environment: RuntimeEnvironment,
    private readonly runtimeApiClient = new RuntimeApiClient(environment),
    private readonly runtimeIdentityStore = new RuntimeIdentityStore(
      environment.repositoriesRoot,
    ),
    private readonly localRepoRegistry = new LocalRepoRegistry(
      environment.repositoriesRoot,
    ),
    private readonly branchManager = new BranchManager(),
    private readonly repoSyncService = new RepoSyncService(localRepoRegistry),
    private readonly worktreeManager = new WorktreeManager(
      environment.repositoriesRoot,
    ),
    private readonly recoveryService = new RecoveryService(
      environment.repositoriesRoot,
      localRepoRegistry,
      runtimeApiClient,
      worktreeManager,
    ),
    private readonly planningExecutionService = new PlanningExecutionService(
      environment,
    ),
  ) {}

  public async start(): Promise<void> {
    assertValidAgentModelConfig();
    assertRuntimeProviderConfiguration({
      environment: this.environment,
    });
    await mkdir(this.environment.repositoriesRoot, { recursive: true });
    await this.localRepoRegistry.ensureStorage();

    const persistedIdentity = await this.runtimeIdentityStore.load();
    this.logStartupDiagnostics(persistedIdentity);
    await this.registerRuntime();
    await this.recoveryService.reconcileOnStartup();
    await this.flushHeartbeat('Runtime registered and startup heartbeat sent.', true);
    this.startHeartbeatLoop();
    this.startWorkPollingLoop();

    log('info', 'Runtime shell started.', {
      runtimeId: this.environment.runtimeId,
      apiBaseUrl: this.environment.apiBaseUrl,
      repositoriesRoot: this.environment.repositoriesRoot,
      heartbeatIntervalMs: this.environment.heartbeatIntervalMs,
      workPollingEnabled: this.environment.workPollingEnabled,
    });
  }

  public async stop(signal: NodeJS.Signals): Promise<void> {
    if (this.isStopping) {
      return;
    }

    this.isStopping = true;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.workPollTimer) {
      clearTimeout(this.workPollTimer);
      this.workPollTimer = null;
    }
    if (this.leaseProgressTimer) {
      clearInterval(this.leaseProgressTimer);
      this.leaseProgressTimer = null;
    }
    await this.cancelActiveLeaseContext(`Runtime shutdown requested by ${signal}.`);

    this.currentStatus = 'idle';
    this.activeJobSummary = null;
    this.lastAction = `Runtime shutdown requested by ${signal}.`;

    await this.flushHeartbeat(this.lastAction, true);
    log('warn', 'Runtime shell stopping.', {
      runtimeId: this.environment.runtimeId,
      signal,
    });
  }

  private logStartupDiagnostics(
    persistedIdentity: PersistedRuntimeIdentity | null,
  ): void {
    log('info', 'Runtime startup diagnostics.', {
      runtimeId: this.environment.runtimeId,
      displayName: this.environment.runtimeDisplayName,
      capabilities: this.environment.runtimeCapabilities,
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd(),
      repositoriesRoot: this.environment.repositoriesRoot,
      repoRegistryPath: this.localRepoRegistry.getMetadataFilePath(),
      previousRegistration: persistedIdentity?.lastRegisteredAt ?? null,
      agentModelRouting: getActiveAgentModelRoutingSummary(),
      providerCredentials: getRuntimeProviderCredentialSummary({
        environment: this.environment,
      }),
      workPollingEnabled: this.environment.workPollingEnabled,
      workPollIntervalMs: this.environment.workPollIntervalMs,
      workPollIdleBackoffMs: this.environment.workPollIdleBackoffMs,
      workPollMaxBackoffMs: this.environment.workPollMaxBackoffMs,
      leaseProgressIntervalMs: this.environment.leaseProgressIntervalMs,
    });
  }

  private async registerRuntime(): Promise<void> {
    let attempt = 0;
    let lastError: unknown;

    while (!this.isStopping) {
      attempt += 1;

      try {
        const detail = await this.runtimeApiClient.registerRuntime({
          runtimeId: this.environment.runtimeId,
          displayName: this.environment.runtimeDisplayName,
          capabilities: this.environment.runtimeCapabilities,
        });

        this.registeredIdentity = detail;
        this.lastAction = 'Runtime registered with API.';
        this.lastError = detail.lastError;
        await this.persistIdentity(detail);
        log('info', 'Runtime registration completed.', {
          runtimeId: detail.runtimeId,
          connectionStatus: detail.connectionStatus,
          capabilities: detail.capabilities,
        });
        return;
      } catch (error) {
        lastError = error;

        if (!this.isRetryableStartupError(error)) {
          throw error;
        }

        const delayMs = Math.min(
          this.environment.apiRetryBaseDelayMs * 2 ** (attempt - 1),
          10_000,
        );
        const message =
          error instanceof Error ? error.message : 'Unknown registration error';

        this.currentStatus = 'degraded';
        this.lastError = message;
        this.lastAction = 'Waiting for API runtime registration to succeed.';

        log('warn', 'Runtime registration is waiting for API availability.', {
          runtimeId: this.environment.runtimeId,
          apiBaseUrl: this.environment.apiBaseUrl,
          attempt,
          delayMs,
          error: message,
        });

        await sleep(delayMs);
      }
    }

    throw lastError ?? new Error('Runtime registration aborted during shutdown.');
  }

  private isRetryableStartupError(error: unknown): boolean {
    if (!(error instanceof ApiClientError)) {
      return true;
    }

    return error.statusCode === 429 || error.statusCode >= 500;
  }

  private startHeartbeatLoop(): void {
    this.heartbeatTimer = setInterval(() => {
      void this.flushHeartbeat('Scheduled heartbeat sent.');
    }, this.environment.heartbeatIntervalMs);
  }

  private startWorkPollingLoop(): void {
    if (!this.environment.workPollingEnabled) {
      log('info', 'Work polling is disabled.', {
        runtimeId: this.environment.runtimeId,
      });
      return;
    }

    this.scheduleNextWorkPoll(0);
  }

  private scheduleNextWorkPoll(delayMs: number): void {
    if (this.isStopping || !this.environment.workPollingEnabled) {
      return;
    }

    if (this.workPollTimer) {
      clearTimeout(this.workPollTimer);
    }

    this.workPollTimer = setTimeout(() => {
      void this.pollForWork();
    }, delayMs);
  }

  private async pollForWork(): Promise<void> {
    if (
      this.isStopping ||
      !this.registeredIdentity ||
      !this.environment.workPollingEnabled ||
      this.workPollInFlight
    ) {
      return;
    }

    if (this.activeLeaseContext) {
      this.scheduleNextWorkPoll(this.environment.workPollIntervalMs);
      return;
    }

    this.workPollInFlight = true;

    try {
      this.lastAction = 'Polling API for available leased work.';
      const dispatch = await this.runtimeApiClient.requestWork(
        this.environment.runtimeId,
      );

      if (!dispatch.lease || !dispatch.project || !dispatch.workItem) {
        this.handleIdlePoll(dispatch);
        return;
      }

      await this.handleLeasedWork(dispatch);
      this.scheduleNextWorkPoll(this.environment.workPollIntervalMs);
    } catch (error) {
      this.currentStatus = 'degraded';
      this.lastError =
        error instanceof Error ? error.message : 'Unknown work polling failure';
      this.lastAction = 'Work polling failed.';
      log('error', 'Runtime work polling failed.', {
        runtimeId: this.environment.runtimeId,
        error: this.lastError,
      });

      this.scheduleNextWorkPoll(this.nextIdleBackoffMs());
    } finally {
      this.workPollInFlight = false;
    }
  }

  private handleIdlePoll(dispatch: RuntimeWorkDispatchResponse): void {
    const delayMs = this.nextIdleBackoffMs();

    this.currentStatus = 'idle';
    this.activeJobSummary = null;
    this.lastError = null;
    this.lastAction = 'No leased work available; runtime is idle.';
    log('debug', 'Runtime poll returned no work.', {
      runtimeId: this.environment.runtimeId,
      recoveredCount: dispatch.recoveredCount,
      nextPollInMs: delayMs,
    });

    this.scheduleNextWorkPoll(delayMs);
  }

  private async handleLeasedWork(
    dispatch: RuntimeWorkDispatchResponse,
  ): Promise<void> {
    if (!dispatch.lease || !dispatch.project || !dispatch.workItem) {
      return;
    }

    this.idleBackoffMs = 0;
    this.currentStatus = 'busy';
    this.lastError = null;
    this.activeJobSummary = `Leased ${dispatch.workItem.title} for ${dispatch.lease.lane}`;
    this.lastAction = `Lease ${dispatch.lease.id} acquired for ${dispatch.workItem.title}.`;
    this.activeLeaseContext = {
      lease: dispatch.lease,
      abortController: new AbortController(),
      receivedAt: new Date().toISOString(),
    };

    try {
      if (dispatch.lease.lane === 'planning') {
        this.startLeaseProgressLoop();
        this.activeJobSummary = `Planning ${dispatch.workItem.title}`;
        this.lastAction = `Executing planning for work item ${dispatch.workItem.id}.`;

        const planningExecution = await this.planningExecutionService.execute({
          dispatch,
        });

        const execution = await this.runtimeApiClient.executePlanning({
          projectId: dispatch.project.id,
          workItemId: dispatch.workItem.id,
          payload: {
            runtimeId: this.environment.runtimeId,
            leaseId: dispatch.lease.id,
            generatedResult: planningExecution.generatedResult,
          },
        });

        if (planningExecution.usage) {
          await this.runtimeApiClient.createUsageEvent({
            projectId: dispatch.project.id,
            payload: {
              workItemId: dispatch.workItem.id,
              agentRunId: execution.runId,
              runtimeId: this.environment.runtimeId,
              agentType: 'planning',
              provider: planningExecution.usage.provider,
              model: planningExecution.usage.model,
              inputTokens: planningExecution.usage.inputTokens,
              outputTokens: planningExecution.usage.outputTokens,
              totalTokens: planningExecution.usage.totalTokens,
            },
          });
        }

        if (this.leaseProgressTimer) {
          clearInterval(this.leaseProgressTimer);
          this.leaseProgressTimer = null;
        }

        await this.finalizeActiveLease({
          outcome: 'completed',
          nextState: execution.accepted
            ? 'planning'
            : 'requiresHumanIntervention',
          summary: execution.comment,
        });

        this.activeLeaseContext = null;
        this.activeJobSummary = null;
        this.currentStatus = 'idle';
        this.lastAction = `Lease ${dispatch.lease.id} completed via planning execution.`;

        log('info', 'Runtime executed leased planning work item.', {
          runtimeId: this.environment.runtimeId,
          leaseId: dispatch.lease.id,
          projectId: dispatch.project.id,
          workItemId: dispatch.workItem.id,
          accepted: execution.accepted,
          nextState: execution.accepted
            ? 'planning'
            : 'requiresHumanIntervention',
          createdTaskCount: execution.tasks.length,
        });

        return;
      }

      const repoRegistration = await this.repoSyncService.ensureProjectRepository({
        id: dispatch.project.id,
        slug: dispatch.project.slug,
        repository: dispatch.project.repository,
      });
      const resolvedRepository =
        repoRegistration.repository ?? dispatch.project.repository;
      const branchName = this.branchManager.createBranchName({
        projectSlug: dispatch.project.slug,
        workItemId: dispatch.workItem.id,
        title: dispatch.workItem.title,
        lane: dispatch.lease.lane,
      });
      const baseBranch = this.branchManager.getBaseBranch({
        baseBranch: resolvedRepository.baseBranch,
        defaultBranch: resolvedRepository.defaultBranch,
      });

      await this.branchManager.ensureWorkItemBranch({
        repositoryPath: repoRegistration.localPath,
        branchName,
        baseBranch,
      });

      const cleanupCandidates = await this.branchManager.getCleanupCandidates({
        repositoryPath: repoRegistration.localPath,
        activeBranches: [branchName],
      });
      const preparedWorktree = await this.worktreeManager.ensureWorktree({
        repositoryPath: repoRegistration.localPath,
        projectSlug: dispatch.project.slug,
        workItemId: dispatch.workItem.id,
        branchName,
        baseBranch,
      });
      const persistedWorktree = await this.runtimeApiClient.upsertWorktree({
        projectId: dispatch.project.id,
        workItemId: dispatch.workItem.id,
        leaseId: dispatch.lease.id,
        status: this.getLockedWorktreeStatus(dispatch.lease.lane),
        path: preparedWorktree.path,
        branchName: preparedWorktree.branchName,
        baseBranch: preparedWorktree.baseBranch,
        headSha: preparedWorktree.headSha,
        isDirty: preparedWorktree.isDirty,
        details: 'Canonical runtime worktree prepared for leased work item.',
      });

      this.activeLeaseContext = {
        lease: dispatch.lease,
        abortController: this.activeLeaseContext?.abortController ?? new AbortController(),
        receivedAt: new Date().toISOString(),
        branchName,
        worktree: persistedWorktree,
        repositoryPath: repoRegistration.localPath,
      };

      this.startLeaseProgressLoop();
      this.lastAction = `Lease ${dispatch.lease.id} acquired and branch ${branchName} prepared at ${repoRegistration.localPath}.`;

      if (dispatch.lease.lane === 'dev') {
        this.activeJobSummary = `Executing ${dispatch.workItem.title} in ${preparedWorktree.branchName}`;
        this.lastAction = `Executing dev work item ${dispatch.workItem.id} in ${preparedWorktree.path}.`;

        const execution = await this.runtimeApiClient.executeDevTask({
          projectId: dispatch.project.id,
          workItemId: dispatch.workItem.id,
          payload: {
            runtimeId: this.environment.runtimeId,
            leaseId: dispatch.lease.id,
            worktreePath: preparedWorktree.path,
            branchName: preparedWorktree.branchName,
            baseBranch: preparedWorktree.baseBranch,
            headSha: preparedWorktree.headSha,
          },
        });

        if (this.leaseProgressTimer) {
          clearInterval(this.leaseProgressTimer);
          this.leaseProgressTimer = null;
        }

        await this.finalizeActiveLease({
          outcome: 'completed',
          nextState: execution.nextState,
          summary: execution.comment,
        });

        this.activeLeaseContext = null;
        this.activeJobSummary = null;
        this.currentStatus = 'idle';
        this.lastAction = `Lease ${dispatch.lease.id} completed via dev execution.`;

        log('info', 'Runtime executed leased dev work item.', {
          runtimeId: this.environment.runtimeId,
          leaseId: dispatch.lease.id,
          projectId: dispatch.project.id,
          workItemId: dispatch.workItem.id,
          branchName: execution.branchName,
          worktreePath: execution.worktreePath,
          nextState: execution.nextState,
        });

        return;
      }

      if (dispatch.lease.lane === 'review') {
        this.activeJobSummary = `Reviewing ${dispatch.workItem.title}`;
        this.lastAction = `Executing review for work item ${dispatch.workItem.id}.`;

        const execution = await this.runtimeApiClient.executeReview({
          projectId: dispatch.project.id,
          workItemId: dispatch.workItem.id,
          payload: {
            runtimeId: this.environment.runtimeId,
            leaseId: dispatch.lease.id,
          },
        });

        if (this.leaseProgressTimer) {
          clearInterval(this.leaseProgressTimer);
          this.leaseProgressTimer = null;
        }

        await this.finalizeActiveLease({
          outcome: 'completed',
          nextState: execution.nextState,
          summary: execution.comment,
        });

        this.activeLeaseContext = null;
        this.activeJobSummary = null;
        this.currentStatus = 'idle';
        this.lastAction = `Lease ${dispatch.lease.id} completed via review execution.`;

        log('info', 'Runtime executed leased review work item.', {
          runtimeId: this.environment.runtimeId,
          leaseId: dispatch.lease.id,
          projectId: dispatch.project.id,
          workItemId: dispatch.workItem.id,
          nextState: execution.nextState,
          passed: execution.passed,
        });

        return;
      }

      if (dispatch.lease.lane === 'release') {
        this.activeJobSummary = `Releasing ${dispatch.workItem.title}`;
        this.lastAction = `Executing release for work item ${dispatch.workItem.id}.`;

        const execution = await this.runtimeApiClient.executeRelease({
          projectId: dispatch.project.id,
          workItemId: dispatch.workItem.id,
          payload: {
            runtimeId: this.environment.runtimeId,
            leaseId: dispatch.lease.id,
            outcome: 'success',
          },
        });

        if (this.leaseProgressTimer) {
          clearInterval(this.leaseProgressTimer);
          this.leaseProgressTimer = null;
        }

        await this.finalizeActiveLease({
          outcome: 'completed',
          nextState: execution.nextState,
          summary: execution.comment,
        });

        this.activeLeaseContext = null;
        this.activeJobSummary = null;
        this.currentStatus = 'idle';
        this.lastAction = `Lease ${dispatch.lease.id} completed via release execution.`;

        log('info', 'Runtime executed leased release work item.', {
          runtimeId: this.environment.runtimeId,
          leaseId: dispatch.lease.id,
          projectId: dispatch.project.id,
          workItemId: dispatch.workItem.id,
          nextState: execution.nextState,
          releaseRunId: execution.releaseRun.id,
        });

        return;
      }

      log('warn', 'Runtime leased work and paused further polling until execution is available.', {
        runtimeId: this.environment.runtimeId,
        leaseId: dispatch.lease.id,
        projectId: dispatch.project.id,
        workItemId: dispatch.workItem.id,
        lane: dispatch.lease.lane,
        localPath: repoRegistration.localPath,
        branchName,
        baseBranch,
        cleanupCandidates,
        worktreePath: preparedWorktree.path,
        worktreeId: persistedWorktree.id,
        isDirty: preparedWorktree.isDirty,
      });
    } catch (error) {
      if (this.leaseProgressTimer) {
        clearInterval(this.leaseProgressTimer);
        this.leaseProgressTimer = null;
      }

      await this.finalizeActiveLease({
        outcome: 'failed',
        errorMessage:
          error instanceof Error ? error.message : 'Unknown leased work failure.',
      });
      this.activeLeaseContext = null;
      this.activeJobSummary = null;
      throw error;
    }
  }

  private nextIdleBackoffMs(): number {
    const next =
      this.idleBackoffMs === 0
        ? this.environment.workPollIdleBackoffMs
        : Math.min(
            this.environment.workPollMaxBackoffMs,
            this.idleBackoffMs * 2,
          );

    this.idleBackoffMs = next;
    return next;
  }

  private async cancelActiveLeaseContext(reason: string): Promise<void> {
    if (!this.activeLeaseContext) {
      return;
    }

    if (this.leaseProgressTimer) {
      clearInterval(this.leaseProgressTimer);
      this.leaseProgressTimer = null;
    }

    this.activeLeaseContext.abortController.abort(reason);

    if (this.activeLeaseContext.worktree) {
      await this.runtimeApiClient.requestWorktreeCleanup(
        this.activeLeaseContext.lease.projectId,
        this.activeLeaseContext.worktree.id,
        reason,
      );

      if (
        this.activeLeaseContext.repositoryPath &&
        (await this.worktreeManager.isStale(
          this.activeLeaseContext.repositoryPath,
          this.activeLeaseContext.worktree.path,
        ))
      ) {
        await this.runtimeApiClient.markWorktreeStale(
          this.activeLeaseContext.lease.projectId,
          this.activeLeaseContext.worktree.id,
          'Runtime detected a stale local worktree during lease cancellation.',
        );
      }
    }

    await this.finalizeActiveLease({
      outcome: 'cancelled',
      summary: reason,
    });

    log('warn', 'Runtime cancelled active lease context.', {
      runtimeId: this.environment.runtimeId,
      leaseId: this.activeLeaseContext.lease.id,
      reason,
    });
    this.activeLeaseContext = null;
    this.activeJobSummary = null;
  }

  private startLeaseProgressLoop(): void {
    if (!this.activeLeaseContext) {
      return;
    }

    if (this.leaseProgressTimer) {
      clearInterval(this.leaseProgressTimer);
    }

    this.leaseProgressTimer = setInterval(() => {
      void this.sendLeaseProgress();
    }, this.environment.leaseProgressIntervalMs);
  }

  private async sendLeaseProgress(): Promise<void> {
    if (!this.activeLeaseContext) {
      return;
    }

    await this.runtimeApiClient.sendLeaseProgress(
      this.environment.runtimeId,
      this.activeLeaseContext.lease.id,
      {
        leaseToken: this.activeLeaseContext.lease.leaseToken,
        activeJobSummary:
          this.activeJobSummary ??
          `Working on ${this.activeLeaseContext.lease.workItemTitle}`,
        lastAction: this.lastAction,
      },
    );
  }

  private async finalizeActiveLease(input: {
    outcome: 'completed' | 'failed' | 'cancelled';
    nextState?:
      | 'planning'
      | 'readyForDev'
      | 'inDev'
      | 'readyForReview'
      | 'inReview'
      | 'readyForRelease'
      | 'requiresHumanIntervention'
      | 'released';
    summary?: string;
    errorMessage?: string;
  }): Promise<void> {
    if (!this.activeLeaseContext) {
      return;
    }

    await this.runtimeApiClient.submitJobResult(
      this.environment.runtimeId,
      this.activeLeaseContext.lease.id,
      {
        leaseToken: this.activeLeaseContext.lease.leaseToken,
        outcome: input.outcome,
        nextState: input.nextState,
        summary: input.summary,
        errorMessage: input.errorMessage,
      },
    );
  }

  private getLockedWorktreeStatus(lane: SchedulerLease['lane']) {
    switch (lane) {
      case 'review':
        return 'lockedByReview' as const;
      case 'release':
        return 'lockedByRelease' as const;
      default:
        return 'lockedByDev' as const;
    }
  }

  private async flushHeartbeat(
    lastAction: string,
    force = false,
  ): Promise<void> {
    if (!this.registeredIdentity) {
      return;
    }

    if (this.heartbeatInFlight) {
      if (force) {
        log('warn', 'Skipping forced heartbeat because one is already in flight.', {
          runtimeId: this.environment.runtimeId,
        });
      }
      return;
    }

    this.lastAction = lastAction;
    this.heartbeatInFlight = true;

    try {
      const detail = await this.runtimeApiClient.sendHeartbeat(
        this.environment.runtimeId,
        {
          status: this.currentStatus,
          activeJobSummary: this.activeJobSummary ?? undefined,
          lastAction: this.lastAction,
          lastError: this.lastError ?? undefined,
        },
      );

      this.registeredIdentity = detail;
      this.lastError = detail.lastError;
      await this.persistIdentity(detail);
      log('debug', 'Runtime heartbeat completed.', {
        runtimeId: detail.runtimeId,
        reportedStatus: detail.reportedStatus,
        lastSeenAt: detail.lastSeenAt,
      });
    } catch (error) {
      this.currentStatus = 'degraded';
      this.lastError = error instanceof Error ? error.message : 'Unknown heartbeat failure';
      log('error', 'Runtime heartbeat failed.', {
        runtimeId: this.environment.runtimeId,
        error: this.lastError,
      });

      if (force) {
        throw error;
      }
    } finally {
      this.heartbeatInFlight = false;
    }
  }

  private async persistIdentity(detail: RuntimeDetailResponse): Promise<void> {
    await this.runtimeIdentityStore.save({
      runtimeId: detail.runtimeId,
      displayName: detail.displayName,
      capabilities: detail.capabilities,
      apiBaseUrl: this.environment.apiBaseUrl,
      lastRegisteredAt: new Date().toISOString(),
      lastSeenAt: detail.lastSeenAt,
    });
  }
}
