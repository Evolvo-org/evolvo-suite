import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateReviewGateResultRequest,
  ReviewGateListResponse,
  ReviewGateResultRecord,
  ReviewGateSummaryResponse,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';

import {
  mapReviewGateList,
  mapReviewGateResult,
  mapReviewGateSummary,
} from './review-gates.mapper.js';

const toPrismaOverallStatus = (
  value: CreateReviewGateResultRequest['overallStatus'],
  checks: CreateReviewGateResultRequest['checks'],
) => {
  if (value === 'failed') {
    return 'FAILED' as const;
  }

  if (value === 'passed') {
    return 'PASSED' as const;
  }

  return checks.some((check) => check.status === 'failed')
    ? ('FAILED' as const)
    : ('PASSED' as const);
};

const toPrismaCheckName = (value: CreateReviewGateResultRequest['checks'][number]['name']) => {
  switch (value) {
    case 'build':
      return 'BUILD' as const;
    case 'lint':
      return 'LINT' as const;
    case 'typecheck':
      return 'TYPECHECK' as const;
    case 'test':
      return 'TEST' as const;
    case 'acceptanceCriteria':
      return 'ACCEPTANCE_CRITERIA' as const;
    default:
      return 'REVIEW_FEEDBACK' as const;
  }
};

const toPrismaCheckStatus = (
  value: CreateReviewGateResultRequest['checks'][number]['status'],
) => {
  switch (value) {
    case 'failed':
      return 'FAILED' as const;
    case 'skipped':
      return 'SKIPPED' as const;
    default:
      return 'PASSED' as const;
  }
};

@Injectable()
export class ReviewGatesService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
  ) {}

  public async createResult(
    projectId: string,
    workItemId: string,
    payload: CreateReviewGateResultRequest,
  ): Promise<ReviewGateResultRecord> {
    await this.projectsService.ensureProjectExists(projectId);
    await this.assertWorkItemBelongsToProject(projectId, workItemId);
    await this.assertRuntimeIfProvided(payload.runtimeId);
    await this.assertLeaseIfProvided(projectId, workItemId, payload.leaseId);
    await this.assertAgentRunIfProvided(projectId, workItemId, payload.agentRunId);
    await this.assertCriteriaBelongToWorkItem(
      projectId,
      workItemId,
      payload.criteriaEvaluations ?? [],
    );

    const result = await this.prisma.reviewGateResult.create({
      data: {
        projectId,
        workItemId,
        runtimeId: payload.runtimeId?.trim(),
        leaseId: payload.leaseId?.trim(),
        agentRunId: payload.agentRunId?.trim(),
        overallStatus: toPrismaOverallStatus(payload.overallStatus, payload.checks),
        summary: payload.summary?.trim(),
        checks: {
          create: payload.checks.map((check) => ({
            name: toPrismaCheckName(check.name),
            status: toPrismaCheckStatus(check.status),
            details: check.details?.trim(),
          })),
        },
        criteriaEvaluations: {
          create: (payload.criteriaEvaluations ?? []).map((evaluation) => ({
            criterionId: evaluation.criterionId?.trim(),
            text: evaluation.text.trim(),
            status: toPrismaCheckStatus(evaluation.status),
            details: evaluation.details?.trim(),
            sortOrder: evaluation.sortOrder ?? 0,
          })),
        },
      },
      include: this.resultInclude,
    });

    return mapReviewGateResult(result);
  }

  public async listResults(
    projectId: string,
    workItemId: string,
  ): Promise<ReviewGateListResponse> {
    await this.projectsService.ensureProjectExists(projectId);
    await this.assertWorkItemBelongsToProject(projectId, workItemId);

    const results = await this.prisma.reviewGateResult.findMany({
      where: { projectId, workItemId },
      orderBy: [{ createdAt: 'desc' }],
      include: this.resultInclude,
    });

    return mapReviewGateList(projectId, workItemId, results);
  }

  public async getSummary(
    projectId: string,
    workItemId: string,
  ): Promise<ReviewGateSummaryResponse> {
    await this.projectsService.ensureProjectExists(projectId);
    await this.assertWorkItemBelongsToProject(projectId, workItemId);

    const results = await this.prisma.reviewGateResult.findMany({
      where: { projectId, workItemId },
      orderBy: [{ createdAt: 'desc' }],
      include: this.resultInclude,
    });

    return mapReviewGateSummary(projectId, workItemId, results);
  }

  private get resultInclude() {
    return {
      checks: {
        orderBy: { createdAt: 'asc' as const },
      },
      criteriaEvaluations: {
        orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
      },
    };
  }

  private async assertWorkItemBelongsToProject(
    projectId: string,
    workItemId: string,
  ): Promise<void> {
    const workItem = await this.prisma.workItem.findFirst({
      where: { id: workItemId, projectId },
      select: { id: true },
    });

    if (!workItem) {
      throw new NotFoundException('Work item not found for project.');
    }
  }

  private async assertRuntimeIfProvided(runtimeId?: string): Promise<void> {
    if (!runtimeId) {
      return;
    }

    const runtime = await this.prisma.runtimeInstance.findUnique({
      where: { id: runtimeId.trim() },
      select: { id: true },
    });

    if (!runtime) {
      throw new NotFoundException('Runtime not found.');
    }
  }

  private async assertLeaseIfProvided(
    projectId: string,
    workItemId: string,
    leaseId?: string,
  ): Promise<void> {
    if (!leaseId) {
      return;
    }

    const lease = await this.prisma.workItemLease.findFirst({
      where: { id: leaseId.trim(), projectId, workItemId },
      select: { id: true },
    });

    if (!lease) {
      throw new ConflictException('Lease does not match the project work item.');
    }
  }

  private async assertAgentRunIfProvided(
    projectId: string,
    workItemId: string,
    agentRunId?: string,
  ): Promise<void> {
    if (!agentRunId) {
      return;
    }

    const run = await this.prisma.agentRun.findFirst({
      where: { id: agentRunId.trim(), projectId, workItemId },
      select: { id: true },
    });

    if (!run) {
      throw new ConflictException(
        'Agent run does not match the project work item.',
      );
    }
  }

  private async assertCriteriaBelongToWorkItem(
    projectId: string,
    workItemId: string,
    evaluations: CreateReviewGateResultRequest['criteriaEvaluations'],
  ): Promise<void> {
    const criterionIds = evaluations
      ?.map((evaluation) => evaluation.criterionId?.trim())
      .filter((criterionId): criterionId is string => Boolean(criterionId));

    if (!criterionIds || criterionIds.length === 0) {
      return;
    }

    const criteria = await this.prisma.acceptanceCriterion.findMany({
      where: {
        id: { in: criterionIds },
        workItem: {
          id: workItemId,
          projectId,
        },
      },
      select: { id: true },
    });

    if (criteria.length !== criterionIds.length) {
      throw new ConflictException(
        'One or more acceptance criteria do not match the project work item.',
      );
    }
  }
}
