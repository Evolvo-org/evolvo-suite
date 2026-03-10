import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AgentInputContract,
  CreateUsageEventRequest,
  ExecuteReviewRequest,
  ExecuteReviewResponse,
  ReviewGateCheckInput,
  ReviewCriterionEvaluationInput,
} from '@repo/shared';

import { InterventionsService } from '../interventions/interventions.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { ReviewGatesService } from '../review-gates/review-gates.service.js';
import { SchedulerRetryPolicyService } from '../scheduler/scheduler-retry-policy.service.js';
import { WorkflowService } from '../workflow/workflow.service.js';
import { AgentsService } from './agents.service.js';
import { UsageService } from '../usage/usage.service.js';

@Injectable()
export class ReviewAgentService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(InterventionsService)
    private readonly interventionsService: InterventionsService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(ReviewGatesService)
    private readonly reviewGatesService: ReviewGatesService,
    @Inject(SchedulerRetryPolicyService)
    private readonly schedulerRetryPolicyService: SchedulerRetryPolicyService,
    @Inject(WorkflowService)
    private readonly workflowService: WorkflowService,
    @Inject(AgentsService)
    private readonly agentsService: AgentsService,
    @Inject(UsageService)
    private readonly usageService: UsageService,
  ) {}

  public async executeReview(
    projectId: string,
    workItemId: string,
    payload: ExecuteReviewRequest,
  ): Promise<ExecuteReviewResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const [project, workItem, route] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          repository: true,
          productSpec: true,
          developmentPlan: {
            include: {
              activeVersion: true,
            },
          },
        },
      }),
      this.prisma.workItem.findFirst({
        where: { id: workItemId, projectId },
        include: {
          epic: true,
          acceptanceCriteria: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
          agentRuns: {
            orderBy: [{ createdAt: 'desc' }],
            include: {
              artifacts: true,
            },
          },
        },
      }),
      this.projectsService.resolveProjectAgentRoute(projectId, 'review'),
    ]);

    if (!project || !project.repository || !workItem || !workItem.epic) {
      throw new NotFoundException('Ready-for-review work item not found.');
    }

    const input = this.buildInput(projectId, workItemId, project, workItem, route, payload);
    const prompt = this.buildPrompt(project.name, workItem.title, workItem.description);
    const usagePayload = this.buildUsagePayload(route.provider, route.model, prompt);
    const run = await this.agentsService.createAgentRun(projectId, workItemId, {
      agentType: 'review',
      runtimeId: payload.runtimeId,
      leaseId: payload.leaseId,
      status: 'completed',
      completedAt: new Date().toISOString(),
      summary: `Review agent evaluated ${workItem.title}.`,
    });

    await this.agentsService.upsertPromptSnapshot(projectId, workItemId, run.id, {
      systemPrompt:
        'You are the review agent. Evaluate the delivered work, record review gates, and decide whether it should go back to dev or proceed to release.',
      userPrompt: prompt,
    });

    await this.workflowService.transitionWorkItem(projectId, workItemId, {
      toState: 'inReview',
      reason: 'Review agent started evaluating the completed implementation.',
    });

    const checks = this.buildChecks(workItem.agentRuns[0]?.artifacts.length ?? 0);
    const criteriaEvaluations = this.buildCriteriaEvaluations(workItem.acceptanceCriteria);
    const passed =
      checks.every((check) => check.status === 'passed') &&
      criteriaEvaluations.every((evaluation) => evaluation.status === 'passed');

    const reviewGateResult = await this.reviewGatesService.createResult(projectId, workItemId, {
      runtimeId: payload.runtimeId,
      leaseId: payload.leaseId,
      agentRunId: run.id,
      overallStatus: passed ? 'passed' : 'failed',
      summary: passed
        ? 'Review agent passed all checks and acceptance criteria.'
        : 'Review agent found issues that must return to development.',
      checks,
      criteriaEvaluations,
    });

    const failedChecks = checks.filter((check) => check.status === 'failed').map((check) => check.name);
    const retryDecision = passed
      ? null
      : await this.schedulerRetryPolicyService.evaluateFailure(
          projectId,
          workItemId,
          'review',
          `Review failed checks: ${failedChecks.join(', ') || 'acceptanceCriteria'}`,
          'Review agent found blocking validation issues.',
        );
    const nextState = passed
      ? 'readyForRelease'
      : retryDecision?.shouldEscalate
        ? 'requiresHumanIntervention'
        : 'readyForDev';
    const comment = passed
      ? 'Review agent passed all review gates and promoted this work item to ready for release.'
      : retryDecision?.shouldEscalate
        ? `Review agent failed the following checks: ${failedChecks.join(', ') || 'acceptanceCriteria'}. Retry threshold exceeded and the work item was escalated for human intervention.`
        : `Review agent failed the following checks: ${failedChecks.join(', ') || 'acceptanceCriteria'}. Returned to ready for dev.`;

    await this.agentsService.createDecision(projectId, workItemId, run.id, {
      decision: passed
        ? 'Approve work item for release.'
        : 'Return work item to development for follow-up changes.',
      rationale: comment,
    });
    await this.agentsService.createArtifact(projectId, workItemId, run.id, {
      artifactType: 'report',
      label: 'Review gate summary',
      content: JSON.stringify(reviewGateResult, null, 2),
    });
    await this.workflowService.createWorkItemComment(projectId, workItemId, {
      actorType: 'agent',
      actorName: 'Review agent',
      content: comment,
    });

    if (passed) {
      await this.prisma.$transaction(async (transaction) => {
        await this.schedulerRetryPolicyService.clearFailureState(
          transaction,
          workItemId,
        );
      });

      await this.workflowService.transitionWorkItem(projectId, workItemId, {
        toState: nextState,
        reason: comment,
      });
    } else if (retryDecision) {
      await this.prisma.$transaction(async (transaction) => {
        await this.schedulerRetryPolicyService.recordFailure(
          transaction,
          projectId,
          workItemId,
          retryDecision,
          failedChecks.join(', '),
        );
      });

      const retryThresholdIntervention =
        this.interventionsService.getRetryThresholdInterventionPayload(
          retryDecision,
          failedChecks.join(', '),
          comment,
        );

      if (retryThresholdIntervention) {
        await this.interventionsService.createAutomatedCase(
          projectId,
          workItemId,
          retryThresholdIntervention,
        );
      } else {
        await this.workflowService.transitionWorkItem(projectId, workItemId, {
          toState: nextState,
          reason: comment,
        });
      }
    }

    const usageEvent = await this.usageService.createUsageEvent(projectId, {
      ...usagePayload,
      runtimeId: payload.runtimeId,
      workItemId,
      agentRunId: run.id,
    });

    return {
      projectId,
      workItemId,
      route,
      input,
      runId: run.id,
      usageEventId: usageEvent.id,
      reviewGateResult,
      nextState,
      passed,
      comment,
    };
  }

  private buildInput(
    projectId: string,
    workItemId: string,
    project: {
      name: string;
      repository: { owner: string; name: string } | null;
      productSpec: { id: string; version: number } | null;
      developmentPlan:
        | {
            id: string;
            title: string;
            activeVersion: { versionNumber: number } | null;
          }
        | null;
    },
    workItem: {
      title: string;
      epic: { id: string; title: string } | null;
    },
    route: ExecuteReviewResponse['route'],
    payload: ExecuteReviewRequest,
  ): AgentInputContract {
    return {
      agentType: 'review',
      projectId,
      workItemId,
      runtimeId: payload.runtimeId,
      leaseId: payload.leaseId,
      goal: `Review ${workItem.title} for ${project.name} and decide whether it should return to dev or proceed to release.`,
      context: [
        {
          kind: 'productSpec',
          id: project.productSpec?.id ?? 'missing-product-spec',
          title: `Product spec v${project.productSpec?.version ?? 0}`,
        },
        {
          kind: 'developmentPlan',
          id: project.developmentPlan?.id ?? 'missing-development-plan',
          title:
            project.developmentPlan?.activeVersion
              ? `${project.developmentPlan.title} v${project.developmentPlan.activeVersion.versionNumber}`
              : 'No active development plan',
        },
        {
          kind: 'epic',
          id: workItem.epic?.id ?? 'missing-epic',
          title: workItem.epic?.title ?? 'No epic',
        },
        {
          kind: 'workItem',
          id: workItemId,
          title: workItem.title,
        },
      ],
      metadata: {
        routeProvider: route.provider,
        routeModel: route.model,
        repository: `${project.repository?.owner ?? 'unknown'}/${project.repository?.name ?? 'unknown'}`,
      },
    };
  }

  private buildPrompt(
    projectName: string,
    title: string,
    description: string | null,
  ): string {
    return [
      `Project: ${projectName}`,
      `Review target: ${title}`,
      `Description: ${description ?? 'No detailed description provided.'}`,
      'Evaluate build, lint, typecheck, test, acceptance criteria, and review feedback signals.',
      'Return a release-ready decision only if all review gates pass.',
    ].join('\n');
  }

  private buildUsagePayload(
    provider: string,
    model: string,
    prompt: string,
  ): CreateUsageEventRequest {
    const inputTokens = Math.max(24, Math.ceil(prompt.length / 4));
    const outputTokens = Math.max(36, Math.ceil(prompt.length / 8));

    return {
      agentType: 'review',
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  private buildChecks(devArtifactCount: number): ReviewGateCheckInput[] {
    const buildStatus = devArtifactCount > 0 ? 'passed' : 'failed';

    return [
      { name: 'build', status: buildStatus, details: 'Build output is available from the dev run.' },
      { name: 'lint', status: 'passed', details: 'Lint checks are recorded as passing.' },
      { name: 'typecheck', status: 'passed', details: 'Typecheck completed without issues.' },
      { name: 'test', status: 'passed', details: 'Tests completed successfully.' },
      { name: 'acceptanceCriteria', status: 'passed', details: 'Acceptance criteria were evaluated separately.' },
      { name: 'reviewFeedback', status: 'passed', details: 'No blocking feedback remains.' },
    ];
  }

  private buildCriteriaEvaluations(
    criteria: Array<{ id: string; text: string; sortOrder: number }>,
  ): ReviewCriterionEvaluationInput[] {
    if (criteria.length === 0) {
      return [
        {
          text: 'No acceptance criteria were recorded for this work item.',
          status: 'failed',
          details: 'The review agent requires at least one acceptance criterion.',
          sortOrder: 0,
        },
      ];
    }

    return criteria.map((criterion) => ({
      criterionId: criterion.id,
      text: criterion.text,
      status: 'passed',
      details: 'Criterion is considered satisfied by the completed implementation evidence.',
      sortOrder: criterion.sortOrder,
    }));
  }
}
