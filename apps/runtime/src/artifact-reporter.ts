import type {
  CreateReviewGateResultRequest,
  ReviewGateCheckName,
  RuntimeArtifactType,
} from '@repo/shared';

import type { QualityGateResult } from './quality-gates';
import { RuntimeApiClient } from './runtime-api-client';

const gateToCheckName = (gate: QualityGateResult['gate']): ReviewGateCheckName => {
  switch (gate) {
    case 'build':
      return 'build';
    case 'lint':
      return 'lint';
    case 'typecheck':
      return 'typecheck';
    default:
      return 'test';
  }
};

export class ArtifactReporter {
  public constructor(private readonly runtimeApiClient: RuntimeApiClient) {}

  public reportArtifactMetadata(input: {
    runtimeId: string;
    leaseId: string;
    artifactType: RuntimeArtifactType;
    fileName: string;
    contentType?: string;
    sizeBytes?: number;
  }) {
    return this.runtimeApiClient.createArtifactMetadata(input);
  }

  public reportLogAttachment(input: {
    runtimeId: string;
    leaseId: string;
    fileName: string;
    sizeBytes?: number;
  }) {
    return this.reportArtifactMetadata({
      runtimeId: input.runtimeId,
      leaseId: input.leaseId,
      artifactType: 'log',
      fileName: input.fileName,
      contentType: 'text/plain',
      sizeBytes: input.sizeBytes,
    });
  }

  public async reportQualityGateResult(input: {
    projectId: string;
    workItemId: string;
    leaseId: string;
    qualityGateResult: QualityGateResult;
  }) {
    const payload: CreateReviewGateResultRequest = {
      runtimeId: input.qualityGateResult.command.command ? undefined : undefined,
      leaseId: input.leaseId,
      overallStatus: input.qualityGateResult.succeeded ? 'passed' : 'failed',
      summary: input.qualityGateResult.summary,
      checks: [
        {
          name: gateToCheckName(input.qualityGateResult.gate),
          status: input.qualityGateResult.succeeded ? 'passed' : 'failed',
          details:
            input.qualityGateResult.command.stderr ||
            input.qualityGateResult.command.stdout ||
            input.qualityGateResult.summary,
        },
      ],
    };

    return this.runtimeApiClient.createReviewGateResult({
      projectId: input.projectId,
      workItemId: input.workItemId,
      payload,
    });
  }

  public async reportReleaseNotesDraft(input: {
    projectId: string;
    workItemId: string;
    leaseId: string;
    worktreeId?: string;
    version: string;
    tagName: string;
    targetBranch?: string;
    commitSha?: string;
    title?: string;
    content: string;
  }) {
    const releaseRun = await this.runtimeApiClient.startReleaseRun({
      projectId: input.projectId,
      workItemId: input.workItemId,
      leaseId: input.leaseId,
      worktreeId: input.worktreeId,
      summary: 'Runtime started a release note draft flow.',
    });

    const versioned = await this.runtimeApiClient.createReleaseVersion({
      projectId: input.projectId,
      workItemId: input.workItemId,
      releaseRunId: releaseRun.id,
      version: input.version,
      tagName: input.tagName,
      targetBranch: input.targetBranch,
      commitSha: input.commitSha,
    });

    return this.runtimeApiClient.upsertReleaseNote({
      projectId: input.projectId,
      workItemId: input.workItemId,
      releaseRunId: versioned.id,
      payload: {
        title: input.title,
        content: input.content,
        format: 'markdown',
      },
    });
  }
}