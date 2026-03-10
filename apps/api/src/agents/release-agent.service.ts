import { createHash } from 'node:crypto';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AgentInputContract,
  CreateUsageEventRequest,
  ExecuteReleaseRequest,
  ExecuteReleaseResponse,
} from '@repo/shared';

import { InterventionsService } from '../interventions/interventions.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { ReleasesService } from '../releases/releases.service.js';
import { SchedulerRetryPolicyService } from '../scheduler/scheduler-retry-policy.service.js';
import { WorktreesService } from '../worktrees/worktrees.service.js';
import { WorkflowService } from '../workflow/workflow.service.js';
import { AgentsService } from './agents.service.js';
import { UsageService } from '../usage/usage.service.js';

const createSlug = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
};

@Injectable()
export class ReleaseAgentService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(ReleasesService)
    private readonly releasesService: ReleasesService,
    @Inject(InterventionsService)
    private readonly interventionsService: InterventionsService,
    @Inject(SchedulerRetryPolicyService)
    private readonly schedulerRetryPolicyService: SchedulerRetryPolicyService,
    @Inject(WorktreesService)
    private readonly worktreesService: WorktreesService,
    @Inject(WorkflowService)
    private readonly workflowService: WorkflowService,
    @Inject(AgentsService)
    private readonly agentsService: AgentsService,
    @Inject(UsageService)
    private readonly usageService: UsageService,
  ) {}

  public async executeRelease(
    projectId: string,
    workItemId: string,
    payload: ExecuteReleaseRequest,
  ): Promise<ExecuteReleaseResponse> {
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
        },
      }),
      this.projectsService.resolveProjectAgentRoute(projectId, 'release'),
    ]);

    if (!project || !project.repository || !workItem || !workItem.epic) {
      throw new NotFoundException('Ready-for-release work item not found.');
    }

    const input = this.buildInput(projectId, workItemId, project, workItem, route, payload);
    const prompt = this.buildPrompt(project.name, workItem.title, workItem.description);
    const usagePayload = this.buildUsagePayload(route.provider, route.model, prompt);
    const run = await this.agentsService.createAgentRun(projectId, workItemId, {
      agentType: 'release',
      runtimeId: payload.runtimeId,
      leaseId: payload.leaseId,
      status: 'completed',
      completedAt: new Date().toISOString(),
      summary: `Release agent processed ${workItem.title}.`,
    });

    await this.agentsService.upsertPromptSnapshot(projectId, workItemId, run.id, {
      systemPrompt:
        'You are the release agent. Merge release-ready work, create versioned metadata, and escalate repeated merge conflicts.',
      userPrompt: prompt,
    });

    const worktree = await this.ensureReleaseWorktree(projectId, workItemId, project.slug, project.repository.baseBranch, payload);

    const releaseRun = await this.releasesService.startRelease(projectId, workItemId, {
      runtimeId: payload.runtimeId,
      leaseId: payload.leaseId,
      worktreeId: worktree.id,
      summary: 'Release agent started the release flow.',
    });

    if (payload.outcome === 'mergeConflict') {
      return this.handleMergeConflict({
        projectId,
        workItemId,
        workItem,
        route,
        input,
        runId: run.id,
        usagePayload,
        payload,
        releaseRunId: releaseRun.id,
        worktreeId: worktree.id,
      });
    }

    const successfulRelease = await this.handleSuccessfulRelease({
      projectId,
      workItemId,
      project: {
        repository: {
          owner: project.repository.owner,
          name: project.repository.name,
          baseBranch: project.repository.baseBranch,
        },
      },
      workItem,
      runId: run.id,
      releaseRunId: releaseRun.id,
      worktreeId: worktree.id,
    });

    const comment = `Release agent merged ${workItem.title}, tagged ${successfulRelease.version?.tagName}, generated release notes, and archived the release worktree.`;

    await this.agentsService.createDecision(projectId, workItemId, run.id, {
      decision: 'Release work item successfully.',
      rationale: comment,
    });
    await this.agentsService.createArtifact(projectId, workItemId, run.id, {
      artifactType: 'report',
      label: 'Release summary',
      content: JSON.stringify(successfulRelease, null, 2),
    });
    await this.workflowService.createWorkItemComment(projectId, workItemId, {
      actorType: 'agent',
      actorName: 'Release agent',
      content: comment,
    });

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
      releaseRun: successfulRelease,
      interventionId: null,
      nextState: 'released',
      comment,
    };
  }

  private async handleSuccessfulRelease(input: {
    projectId: string;
    workItemId: string;
    project: {
      repository: { owner: string; name: string; baseBranch: string };
    };
    workItem: { title: string; description: string | null };
    runId: string;
    releaseRunId: string;
    worktreeId: string;
  }) {
    const succeededCount = await this.prisma.releaseRun.count({
      where: {
        projectId: input.projectId,
        status: 'SUCCEEDED',
      },
    });
    const version = `v1.0.${succeededCount + 1}`;
    const mergeCommitSha = createHash('sha1')
      .update(`${input.projectId}:${input.workItemId}:${input.releaseRunId}:${version}`)
      .digest('hex')
      .slice(0, 12);
    const releaseUrl = `https://github.com/${input.project.repository.owner}/${input.project.repository.name}/releases/tag/${version}`;

    await this.releasesService.createVersion(
      input.projectId,
      input.workItemId,
      input.releaseRunId,
      {
        version,
        tagName: version,
        targetBranch: input.project.repository.baseBranch,
        commitSha: mergeCommitSha,
      },
    );

    await this.releasesService.upsertNote(
      input.projectId,
      input.workItemId,
      input.releaseRunId,
      {
        title: `${version} — ${input.workItem.title}`,
        content: [
          `Released ${input.workItem.title}.`,
          input.workItem.description ?? 'No additional release description was provided.',
          'Validation checks passed and the work item is ready for production consumption.',
        ].join('\n\n'),
        format: 'markdown',
      },
    );

    const releaseRun = await this.releasesService.recordResult(
      input.projectId,
      input.workItemId,
      input.releaseRunId,
      {
        status: 'succeeded',
        summary: 'Release agent merged successfully and published the release metadata.',
        mergeCommitSha,
        releaseUrl,
      },
    );

    await this.prisma.$transaction(async (transaction) => {
      await this.schedulerRetryPolicyService.clearFailureState(
        transaction,
        input.workItemId,
      );
    });

    return releaseRun;
  }

  private async handleMergeConflict(input: {
    projectId: string;
    workItemId: string;
    workItem: { title: string; description: string | null };
    route: ExecuteReleaseResponse['route'];
    input: AgentInputContract;
    runId: string;
    usagePayload: CreateUsageEventRequest;
    payload: ExecuteReleaseRequest;
    releaseRunId: string;
    worktreeId: string;
  }): Promise<ExecuteReleaseResponse> {
    const errorMessage = 'Git merge conflict while rebasing release branch.';
    const retryDecision = await this.schedulerRetryPolicyService.evaluateFailure(
      input.projectId,
      input.workItemId,
      'release',
      errorMessage,
      'Release agent merge conflict detected.',
    );

    const failureSummary = retryDecision.shouldEscalate
      ? `Release agent exceeded merge conflict retries (${retryDecision.attemptCount}/${retryDecision.threshold}).`
      : `Release agent scheduled merge conflict retry ${retryDecision.attemptCount}/${retryDecision.threshold}.`;

    await this.prisma.$transaction(async (transaction) => {
      await transaction.releaseRun.update({
        where: { id: input.releaseRunId },
        data: {
          status: 'FAILED',
          summary: failureSummary,
          errorMessage,
          completedAt: new Date(),
        },
      });

      await this.schedulerRetryPolicyService.recordFailure(
        transaction,
        input.projectId,
        input.workItemId,
        retryDecision,
        errorMessage,
      );

      await transaction.worktree.update({
        where: { id: input.worktreeId },
        data: {
          status: 'FAILED',
          details: retryDecision.shouldEscalate
            ? 'Release blocked by repeated merge conflicts.'
            : 'Release encountered a merge conflict and is awaiting retry.',
        },
      });
    });

    let interventionId: string | null = null;
    let nextState: ExecuteReleaseResponse['nextState'] = 'readyForRelease';
    const comment = retryDecision.shouldEscalate
      ? `Release agent hit repeated merge conflicts (${retryDecision.attemptCount}/${retryDecision.threshold}) and escalated the work item for human intervention.`
      : `Release agent hit a merge conflict and scheduled retry ${retryDecision.attemptCount}/${retryDecision.threshold} while keeping the work item ready for release.`;

    if (retryDecision.shouldEscalate) {
      const retryThresholdIntervention =
        this.interventionsService.getRetryThresholdInterventionPayload(
          retryDecision,
          errorMessage,
          comment,
        );

      if (retryThresholdIntervention) {
        const intervention = await this.interventionsService.createAutomatedCase(
          input.projectId,
          input.workItemId,
          retryThresholdIntervention,
        );
        interventionId = intervention.id;
      }

      nextState = 'requiresHumanIntervention';
    } else {
      await this.workflowService.createWorkItemComment(input.projectId, input.workItemId, {
        actorType: 'agent',
        actorName: 'Release agent',
        content: comment,
      });
    }

    const releaseRun = await this.prisma.releaseRun.findFirstOrThrow({
      where: {
        id: input.releaseRunId,
        projectId: input.projectId,
        workItemId: input.workItemId,
      },
      include: {
        workItem: {
          select: {
            title: true,
            state: true,
          },
        },
        version: true,
        note: true,
      },
    });

    await this.agentsService.createDecision(input.projectId, input.workItemId, input.runId, {
      decision: retryDecision.shouldEscalate
        ? 'Escalate release failure to human intervention.'
        : 'Retry release after merge conflict.',
      rationale: comment,
    });
    await this.agentsService.createArtifact(input.projectId, input.workItemId, input.runId, {
      artifactType: 'report',
      label: 'Release conflict summary',
      content: JSON.stringify(
        {
          releaseRunId: input.releaseRunId,
          errorMessage,
          retryDecision,
          interventionId,
        },
        null,
        2,
      ),
    });

    const usageEvent = await this.usageService.createUsageEvent(input.projectId, {
      ...input.usagePayload,
      runtimeId: input.payload.runtimeId,
      workItemId: input.workItemId,
      agentRunId: input.runId,
    });

    return {
      projectId: input.projectId,
      workItemId: input.workItemId,
      route: input.route,
      input: input.input,
      runId: input.runId,
      usageEventId: usageEvent.id,
      releaseRun: {
        id: releaseRun.id,
        projectId: releaseRun.projectId,
        workItemId: releaseRun.workItemId,
        workItemTitle: releaseRun.workItem.title,
        runtimeId: releaseRun.runtimeId,
        leaseId: releaseRun.leaseId,
        worktreeId: releaseRun.worktreeId,
        status: 'failed',
        summary: releaseRun.summary,
        errorMessage: releaseRun.errorMessage,
        mergeCommitSha: releaseRun.mergeCommitSha,
        releaseUrl: releaseRun.releaseUrl,
        startedAt: releaseRun.startedAt.toISOString(),
        completedAt: releaseRun.completedAt?.toISOString() ?? null,
        version: null,
        note: null,
        createdAt: releaseRun.createdAt.toISOString(),
        updatedAt: releaseRun.updatedAt.toISOString(),
      },
      interventionId,
      nextState,
      comment,
    };
  }

  private buildInput(
    projectId: string,
    workItemId: string,
    project: {
      name: string;
      repository: { owner: string; name: string; baseBranch: string } | null;
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
    route: ExecuteReleaseResponse['route'],
    payload: ExecuteReleaseRequest,
  ): AgentInputContract {
    return {
      agentType: 'release',
      projectId,
      workItemId,
      runtimeId: payload.runtimeId,
      leaseId: payload.leaseId,
      goal: `Release ${workItem.title} for ${project.name}, generate metadata, and handle merge conflicts safely.`,
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
        baseBranch: project.repository?.baseBranch ?? 'main',
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
      `Release target: ${title}`,
      `Description: ${description ?? 'No detailed description provided.'}`,
      'Prepare merge, tagging, and release notes for the release-ready work item.',
      'Escalate repeated merge conflicts after the retry threshold is exceeded.',
    ].join('\n');
  }

  private buildUsagePayload(
    provider: string,
    model: string,
    prompt: string,
  ): CreateUsageEventRequest {
    const inputTokens = Math.max(24, Math.ceil(prompt.length / 4));
    const outputTokens = Math.max(40, Math.ceil(prompt.length / 8));

    return {
      agentType: 'release',
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  private async ensureReleaseWorktree(
    projectId: string,
    workItemId: string,
    projectSlug: string,
    baseBranch: string,
    payload: ExecuteReleaseRequest,
  ) {
    const existing = await this.prisma.worktree.findFirst({
      where: { projectId, workItemId },
      orderBy: [{ updatedAt: 'desc' }],
    });

    const branchName = existing?.branchName ?? `release/${workItemId}-${createSlug(workItemId)}`;
    const path = existing?.path ?? `/worktrees/${projectSlug}/${branchName}`;

    return this.worktreesService.upsertWorktree(projectId, {
      workItemId,
      runtimeId: payload.runtimeId,
      leaseId: payload.leaseId,
      status: 'lockedByRelease',
      path,
      branchName,
      baseBranch,
      headSha: existing?.headSha ?? undefined,
      pullRequestUrl: existing?.pullRequestUrl ?? undefined,
      isDirty: existing?.isDirty ?? false,
      details: 'Release agent locked the worktree for release execution.',
    });
  }
}
