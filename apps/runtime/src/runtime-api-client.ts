import { randomUUID } from 'node:crypto';
import {
  ApiClientError,
  createReleaseVersion,
  createReviewGateResult,
  createRuntimeArtifactUploadMetadata,
  createUsageEvent,
  configureApiClient,
  executePlanning,
  executeDevTask,
  executeRelease,
  executeReview,
  getProjectWorktrees,
  markProjectWorktreeStale,
  recordReleaseResult,
  registerRuntime,
  requestProjectWorktreeCleanup,
  requestRuntimeWork,
  sendRuntimeProgress,
  sendRuntimeHeartbeat,
  submitRuntimeJobResult,
  startReleaseRun,
  upsertProjectWorktree,
  upsertReleaseNote,
} from '@repo/api-client';
import type {
  CreateReviewGateResultRequest,
  ExecutePlanningRequest,
  ExecutePlanningResponse,
  ExecuteDevTaskRequest,
  ExecuteDevTaskResponse,
  ExecuteReleaseRequest,
  ExecuteReleaseResponse,
  ExecuteReviewRequest,
  ExecuteReviewResponse,
  RecordReleaseResultRequest,
  ReleaseRunRecord,
  RegisterRuntimeRequest,
  CreateUsageEventRequest,
  RuntimeArtifactType,
  RuntimeArtifactUploadMetadataResponse,
  RuntimeDetailResponse,
  RuntimeHeartbeatRequest,
  RuntimeJobResultResponse,
  RuntimeProgressUpdateRequest,
  RuntimeWorkDispatchResponse,
  UpsertReleaseNoteRequest,
  UsageEventRecord,
  WorktreeListResponse,
  WorktreeStatus,
  WorktreeResponse,
} from '@repo/shared';

import type { RuntimeEnvironment } from './config';
import { log } from './logger';

const sleep = async (durationMs: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

export class RuntimeApiClient {
  private currentCorrelationId: string | null = null;

  public constructor(private readonly environment: RuntimeEnvironment) {
    configureApiClient({
      baseUrl: environment.apiBaseUrl,
      defaultHeaders: () => ({
        ...(this.environment.apiAuthToken
          ? { authorization: `Bearer ${this.environment.apiAuthToken}` }
          : {}),
        ...(this.currentCorrelationId
          ? { 'x-correlation-id': this.currentCorrelationId }
          : {}),
        'x-runtime-id': this.environment.runtimeId,
      }),
    });
  }

  public async registerRuntime(
    payload: RegisterRuntimeRequest,
  ): Promise<RuntimeDetailResponse> {
    return this.withRequestContext(() =>
      this.executeWithRetry('registerRuntime', async () => {
        const response = await registerRuntime(payload);
        return response.data;
      }),
    );
  }

  public async sendHeartbeat(
    runtimeId: string,
    payload: RuntimeHeartbeatRequest,
  ): Promise<RuntimeDetailResponse> {
    return this.withRequestContext(() =>
      this.executeWithRetry('sendRuntimeHeartbeat', async () => {
        const response = await sendRuntimeHeartbeat(runtimeId, payload);
        return response.data;
      }),
    );
  }

  public async requestWork(runtimeId: string): Promise<RuntimeWorkDispatchResponse> {
    return this.withRequestContext(() =>
      this.executeWithRetry('requestRuntimeWork', async () => {
        const response = await requestRuntimeWork(runtimeId);
        return response.data;
      }),
    );
  }

  public async sendLeaseProgress(
    runtimeId: string,
    leaseId: string,
    payload: RuntimeProgressUpdateRequest,
  ) {
    return this.withRequestContext(() =>
      this.executeWithRetry('sendRuntimeProgress', async () => {
        const response = await sendRuntimeProgress(runtimeId, leaseId, payload);
        return response.data;
      }),
    );
  }

  public async submitJobResult(
    runtimeId: string,
    leaseId: string,
    payload: {
      leaseToken: string;
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
    },
  ): Promise<RuntimeJobResultResponse> {
    return this.withRequestContext(() =>
      this.executeWithRetry('submitRuntimeJobResult', async () => {
        const response = await submitRuntimeJobResult(runtimeId, leaseId, payload);
        return response.data;
      }),
    );
  }

  public async upsertWorktree(input: {
    projectId: string;
    workItemId: string;
    leaseId: string;
    status: WorktreeStatus;
    path: string;
    branchName: string;
    baseBranch: string;
    headSha: string;
    isDirty: boolean;
    details: string;
    pullRequestUrl?: string;
  }): Promise<WorktreeResponse> {
    return this.withRequestContext(() =>
      this.executeWithRetry('upsertProjectWorktree', async () => {
        const response = await upsertProjectWorktree(input.projectId, {
          workItemId: input.workItemId,
          runtimeId: this.environment.runtimeId,
          leaseId: input.leaseId,
          status: input.status,
          path: input.path,
          branchName: input.branchName,
          baseBranch: input.baseBranch,
          headSha: input.headSha,
          pullRequestUrl: input.pullRequestUrl,
          isDirty: input.isDirty,
          details: input.details,
        });

        return response.data;
      }),
    );
  }

  public async executeDevTask(input: {
    projectId: string;
    workItemId: string;
    payload: ExecuteDevTaskRequest;
  }): Promise<ExecuteDevTaskResponse> {
    return this.withRequestContext(() =>
      this.executeWithRetry('executeDevTask', async () => {
        const response = await executeDevTask(
          input.projectId,
          input.workItemId,
          input.payload,
        );

        return response.data;
      }),
    );
  }

  public async executePlanning(input: {
    projectId: string;
    workItemId: string;
    payload: ExecutePlanningRequest;
  }): Promise<ExecutePlanningResponse> {
    return this.withRequestContext(() =>
      this.executeWithRetry('executePlanning', async () => {
        const response = await executePlanning(
          input.projectId,
          input.workItemId,
          input.payload,
        );

        return response.data;
      }),
    );
  }

  public async executeReview(input: {
    projectId: string;
    workItemId: string;
    payload: ExecuteReviewRequest;
  }): Promise<ExecuteReviewResponse> {
    return this.withRequestContext(() =>
      this.executeWithRetry('executeReview', async () => {
        const response = await executeReview(
          input.projectId,
          input.workItemId,
          input.payload,
        );

        return response.data;
      }),
    );
  }

  public async executeRelease(input: {
    projectId: string;
    workItemId: string;
    payload: ExecuteReleaseRequest;
  }): Promise<ExecuteReleaseResponse> {
    return this.withRequestContext(() =>
      this.executeWithRetry('executeRelease', async () => {
        const response = await executeRelease(
          input.projectId,
          input.workItemId,
          input.payload,
        );

        return response.data;
      }),
    );
  }

  public async requestWorktreeCleanup(
    projectId: string,
    worktreeId: string,
    reason: string,
  ): Promise<WorktreeResponse> {
    return this.withRequestContext(() =>
      this.executeWithRetry('requestProjectWorktreeCleanup', async () => {
        const response = await requestProjectWorktreeCleanup(projectId, worktreeId, {
          reason,
        });

        return response.data;
      }),
    );
  }

  public async markWorktreeStale(
    projectId: string,
    worktreeId: string,
    reason: string,
  ): Promise<WorktreeResponse> {
    return this.withRequestContext(() =>
      this.executeWithRetry('markProjectWorktreeStale', async () => {
        const response = await markProjectWorktreeStale(projectId, worktreeId, {
          reason,
        });

        return response.data;
      }),
    );
  }

  public async listProjectWorktrees(
    projectId: string,
  ): Promise<WorktreeListResponse> {
    return this.withRequestContext(() =>
      this.executeWithRetry('getProjectWorktrees', async () => {
        return getProjectWorktrees(projectId);
      }),
    );
  }

  public async createArtifactMetadata(input: {
    runtimeId: string;
    leaseId: string;
    artifactType: RuntimeArtifactType;
    fileName: string;
    contentType?: string;
    sizeBytes?: number;
  }): Promise<RuntimeArtifactUploadMetadataResponse> {
    return this.withRequestContext(() =>
      this.executeWithRetry('createRuntimeArtifactUploadMetadata', async () => {
        const response = await createRuntimeArtifactUploadMetadata(
          input.runtimeId,
          input.leaseId,
          {
            leaseToken: 'pending-runtime-upload',
            artifactType: input.artifactType,
            fileName: input.fileName,
            contentType: input.contentType,
            sizeBytes: input.sizeBytes,
          },
        );

        return response.data;
      }),
    );
  }

  public async createUsageEvent(input: {
    projectId: string;
    payload: CreateUsageEventRequest;
  }): Promise<UsageEventRecord> {
    return this.withRequestContext(() =>
      this.executeWithRetry('createUsageEvent', async () => {
        const response = await createUsageEvent(input.projectId, input.payload);

        return response.data;
      }),
    );
  }

  public async createReviewGateResult(input: {
    projectId: string;
    workItemId: string;
    payload: CreateReviewGateResultRequest;
  }) {
    return this.withRequestContext(() =>
      this.executeWithRetry('createReviewGateResult', async () => {
        const response = await createReviewGateResult(
          input.projectId,
          input.workItemId,
          input.payload,
        );

        return response.data;
      }),
    );
  }

  public async startReleaseRun(input: {
    projectId: string;
    workItemId: string;
    leaseId: string;
    worktreeId?: string;
    summary?: string;
  }): Promise<ReleaseRunRecord> {
    return this.withRequestContext(() =>
      this.executeWithRetry('startReleaseRun', async () => {
        const response = await startReleaseRun(input.projectId, input.workItemId, {
          runtimeId: this.environment.runtimeId,
          leaseId: input.leaseId,
          worktreeId: input.worktreeId,
          summary: input.summary,
        });

        return response.data;
      }),
    );
  }

  public async recordReleaseResult(input: {
    projectId: string;
    workItemId: string;
    releaseRunId: string;
    payload: RecordReleaseResultRequest;
  }): Promise<ReleaseRunRecord> {
    return this.withRequestContext(() =>
      this.executeWithRetry('recordReleaseResult', async () => {
        const response = await recordReleaseResult(
          input.projectId,
          input.workItemId,
          input.releaseRunId,
          input.payload,
        );

        return response.data;
      }),
    );
  }

  public async createReleaseVersion(input: {
    projectId: string;
    workItemId: string;
    releaseRunId: string;
    version: string;
    tagName: string;
    targetBranch?: string;
    commitSha?: string;
  }): Promise<ReleaseRunRecord> {
    return this.withRequestContext(() =>
      this.executeWithRetry('createReleaseVersion', async () => {
        const response = await createReleaseVersion(
          input.projectId,
          input.workItemId,
          input.releaseRunId,
          {
            version: input.version,
            tagName: input.tagName,
            targetBranch: input.targetBranch,
            commitSha: input.commitSha,
          },
        );

        return response.data;
      }),
    );
  }

  public async upsertReleaseNote(input: {
    projectId: string;
    workItemId: string;
    releaseRunId: string;
    payload: UpsertReleaseNoteRequest;
  }): Promise<ReleaseRunRecord> {
    return this.withRequestContext(() =>
      this.executeWithRetry('upsertReleaseNote', async () => {
        const response = await upsertReleaseNote(
          input.projectId,
          input.workItemId,
          input.releaseRunId,
          input.payload,
        );

        return response.data;
      }),
    );
  }

  private async withRequestContext<T>(operation: () => Promise<T>): Promise<T> {
    const previousCorrelationId = this.currentCorrelationId;
    this.currentCorrelationId = randomUUID();

    try {
      return await operation();
    } finally {
      this.currentCorrelationId = previousCorrelationId;
    }
  }

  private async executeWithRetry<T>(
    operationName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < this.environment.apiRetryMaxAttempts) {
      attempt += 1;

      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (!this.isRetryable(error) || attempt >= this.environment.apiRetryMaxAttempts) {
          break;
        }

        const delayMs = this.environment.apiRetryBaseDelayMs * 2 ** (attempt - 1);
        log('warn', 'Retrying runtime API call.', {
          operationName,
          attempt,
          delayMs,
          runtimeId: this.environment.runtimeId,
        });
        await sleep(delayMs);
      }
    }

    throw lastError;
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof ApiClientError) {
      return error.statusCode === 429 || error.statusCode >= 500;
    }

    return true;
  }
}