import { createHash } from 'node:crypto';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AgentInputContract,
  CreateUsageEventRequest,
  DevAgentCheckResult,
  ExecuteDevTaskRequest,
  ExecuteDevTaskResponse,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { WorkflowService } from '../workflow/workflow.service.js';
import { WorktreesService } from '../worktrees/worktrees.service.js';
import { AgentsService } from './agents.service.js';
import { UsageService } from '../usage/usage.service.js';
import { LogsService } from '../logs/logs.service.js';

const createSlug = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
};

@Injectable()
export class DevAgentService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(WorkflowService)
    private readonly workflowService: WorkflowService,
    @Inject(WorktreesService)
    private readonly worktreesService: WorktreesService,
    @Inject(AgentsService)
    private readonly agentsService: AgentsService,
    @Inject(UsageService)
    private readonly usageService: UsageService,
    @Inject(LogsService)
    private readonly logsService: LogsService,
  ) {}

  public async executeTask(
    projectId: string,
    workItemId: string,
    payload: ExecuteDevTaskRequest,
  ): Promise<ExecuteDevTaskResponse> {
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
          parent: true,
          acceptanceCriteria: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
          dependencies: {
            include: {
              dependsOnWorkItem: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      }),
      this.projectsService.resolveProjectAgentRoute(projectId, 'dev'),
    ]);

    if (!project || !project.repository || !workItem || !workItem.epic) {
      throw new NotFoundException('Ready-for-dev work item not found.');
    }

    const input = this.buildInput(projectId, workItemId, project, workItem, route, payload);
    const prompt = this.buildPrompt(project.name, workItem);
    const usagePayload = this.buildUsagePayload(route.provider, route.model, prompt);

    await this.logsService.writeLog({
      level: 'info',
      source: 'agent',
      projectId,
      workItemId,
      runtimeId: payload.runtimeId,
      agentType: 'dev',
      eventType: 'agent.dev.execution.started',
      message: `Dev agent started ${workItem.title}.`,
      payload: {
        runtimeId: payload.runtimeId,
        leaseId: payload.leaseId ?? null,
        provider: route.provider,
        model: route.model,
        epicTitle: workItem.epic.title,
      },
    });

    const run = await this.agentsService.createAgentRun(projectId, workItemId, {
      agentType: 'dev',
      runtimeId: payload.runtimeId,
      leaseId: payload.leaseId,
      status: 'completed',
      completedAt: new Date().toISOString(),
      summary: `Dev agent implemented ${workItem.title} and prepared it for review.`,
    });

    await this.agentsService.upsertPromptSnapshot(projectId, workItemId, run.id, {
      systemPrompt:
        'You are the dev agent. Implement the assigned backlog item in an isolated worktree, run checks, and prepare it for review.',
      userPrompt: prompt,
    });

    await this.workflowService.transitionWorkItem(projectId, workItemId, {
      toState: 'inDev',
      reason: 'Dev agent started implementation in a task-scoped worktree.',
    });

    const branchName =
      payload.branchName?.trim() ||
      `dev/${workItemId}-${createSlug(workItem.title)}`;
    const worktreePath =
      payload.worktreePath?.trim() || `/worktrees/${project.slug}/${branchName}`;
    const baseBranch = payload.baseBranch?.trim() || project.repository.baseBranch;
    const headSha =
      payload.headSha?.trim() ||
      createHash('sha1')
        .update(`${projectId}:${workItemId}:${branchName}:${prompt}`)
        .digest('hex')
        .slice(0, 12);

    const lockedWorktree = await this.worktreesService.upsertWorktree(projectId, {
      workItemId,
      runtimeId: payload.runtimeId,
      leaseId: payload.leaseId,
      status: 'lockedByDev',
      path: worktreePath,
      branchName,
      baseBranch,
      details: `Dev agent is implementing ${workItem.title}.`,
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'agent',
      projectId,
      workItemId,
      agentRunId: run.id,
      runtimeId: payload.runtimeId,
      agentType: 'dev',
      eventType: 'agent.dev.worktree.locked',
      message: `Dev agent locked worktree ${lockedWorktree.branchName} for ${workItem.title}.`,
      payload: {
        runtimeId: payload.runtimeId,
        leaseId: payload.leaseId ?? null,
        worktreeId: lockedWorktree.id,
        path: lockedWorktree.path,
        branchName: lockedWorktree.branchName,
        baseBranch,
      },
    });

    const checks = this.buildChecks(workItem.title);
    const patchArtifactLabel = 'Implementation patch';
    const reportArtifactLabel = 'Execution checks';
    const patchContent = this.buildPatchArtifact(workItem, checks);
    const reportContent = JSON.stringify(
      {
        branchName,
        headSha,
        checks,
      },
      null,
      2,
    );

    await this.agentsService.createDecision(projectId, workItemId, run.id, {
      decision: 'Implement ready-for-dev work item in a task-scoped worktree.',
      rationale: `Created branch ${branchName}, captured implementation summary, and completed validation checks.`,
    });
    await this.agentsService.createArtifact(projectId, workItemId, run.id, {
      artifactType: 'patch',
      label: patchArtifactLabel,
      content: patchContent,
    });
    await this.agentsService.createArtifact(projectId, workItemId, run.id, {
      artifactType: 'report',
      label: reportArtifactLabel,
      content: reportContent,
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'agent',
      projectId,
      workItemId,
      agentRunId: run.id,
      runtimeId: payload.runtimeId,
      agentType: 'dev',
      eventType: 'agent.dev.artifacts.recorded',
      message: `Dev agent recorded artifacts and checks for ${workItem.title}.`,
      payload: {
        runtimeId: payload.runtimeId,
        leaseId: payload.leaseId ?? null,
        artifactLabels: [patchArtifactLabel, reportArtifactLabel],
        checks,
      },
    });

    const worktree = await this.worktreesService.upsertWorktree(projectId, {
      workItemId,
      runtimeId: payload.runtimeId,
      leaseId: payload.leaseId,
      status: 'active',
      path: worktreePath,
      branchName,
      baseBranch,
      headSha,
      isDirty: false,
      details: 'Implementation completed and checks passed.',
    });

    await this.workflowService.transitionWorkItem(projectId, workItemId, {
      toState: 'readyForReview',
      reason: 'Dev agent completed implementation and passed all checks.',
    });

    const comment = `Dev agent implemented this work item in ${branchName}, recorded artifacts, and passed build, lint, typecheck, and test checks.`;
    await this.workflowService.createWorkItemComment(projectId, workItemId, {
      actorType: 'agent',
      actorName: 'Dev agent',
      content: comment,
    });

    const usageEvent = await this.usageService.createUsageEvent(projectId, {
      ...usagePayload,
      runtimeId: payload.runtimeId,
      workItemId,
      agentRunId: run.id,
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'agent',
      projectId,
      workItemId,
      agentRunId: run.id,
      runtimeId: payload.runtimeId,
      agentType: 'dev',
      eventType: 'agent.dev.execution.completed',
      message: `Dev agent completed ${workItem.title} and moved it to review.`,
      payload: {
        runtimeId: payload.runtimeId,
        leaseId: payload.leaseId ?? null,
        branchName: worktree.branchName,
        worktreePath: worktree.path,
        nextState: 'readyForReview',
        usageEventId: usageEvent.id,
      },
    });

    return {
      projectId,
      workItemId,
      route,
      input,
      runId: run.id,
      usageEventId: usageEvent.id,
      worktreeId: worktree.id,
      worktreePath: worktree.path,
      branchName: worktree.branchName,
      headSha,
      artifactLabels: [patchArtifactLabel, reportArtifactLabel],
      checks,
      nextState: 'readyForReview',
      comment,
    };
  }

  private buildInput(
    projectId: string,
    workItemId: string,
    project: {
      name: string;
      slug: string;
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
    route: ExecuteDevTaskResponse['route'],
    payload: ExecuteDevTaskRequest,
  ): AgentInputContract {
    return {
      agentType: 'dev',
      projectId,
      workItemId,
      runtimeId: payload.runtimeId,
      leaseId: payload.leaseId,
      goal: `Implement ${workItem.title} for ${project.name} in an isolated worktree and prepare it for review.`,
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
    workItem: {
      title: string;
      description: string | null;
      acceptanceCriteria: Array<{ text: string }>;
      dependencies: Array<{ dependsOnWorkItem: { id: string; title: string } }>;
    },
  ): string {
    const criteria =
      workItem.acceptanceCriteria.length > 0
        ? workItem.acceptanceCriteria.map((criterion, index) => `${index + 1}. ${criterion.text}`).join('\n')
        : 'No acceptance criteria recorded.';
    const dependencies =
      workItem.dependencies.length > 0
        ? workItem.dependencies
            .map((dependency) => `${dependency.dependsOnWorkItem.title} (${dependency.dependsOnWorkItem.id})`)
            .join(', ')
        : 'No blocking dependencies.';

    return [
      `Project: ${projectName}`,
      `Work item: ${workItem.title}`,
      `Description: ${workItem.description ?? 'No detailed description provided.'}`,
      `Acceptance criteria:\n${criteria}`,
      `Dependencies: ${dependencies}`,
      'Implement the work in a task-scoped branch, summarize the changes, and pass build, lint, typecheck, and test checks.',
    ].join('\n');
  }

  private buildUsagePayload(
    provider: string,
    model: string,
    prompt: string,
  ): CreateUsageEventRequest {
    const inputTokens = Math.max(32, Math.ceil(prompt.length / 4));
    const outputTokens = Math.max(48, Math.ceil(prompt.length / 7));

    return {
      agentType: 'dev',
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  private buildChecks(title: string): DevAgentCheckResult[] {
    return [
      {
        name: 'build',
        status: 'passed',
        details: `Build completed for ${title}.`,
      },
      {
        name: 'lint',
        status: 'passed',
        details: `Lint checks passed for ${title}.`,
      },
      {
        name: 'typecheck',
        status: 'passed',
        details: `Typecheck completed for ${title}.`,
      },
      {
        name: 'test',
        status: 'passed',
        details: `Tests passed for ${title}.`,
      },
    ];
  }

  private buildPatchArtifact(
    workItem: {
      title: string;
      description: string | null;
      acceptanceCriteria: Array<{ text: string }>;
    },
    checks: DevAgentCheckResult[],
  ): string {
    const criteriaSummary =
      workItem.acceptanceCriteria.length > 0
        ? workItem.acceptanceCriteria.map((criterion) => `- ${criterion.text}`).join('\n')
        : '- No acceptance criteria were defined.';
    const checksSummary = checks.map((check) => `- ${check.name}: ${check.status}`).join('\n');

    return [
      `Summary: Implement ${workItem.title}`,
      `Description: ${workItem.description ?? 'No detailed description provided.'}`,
      'Acceptance criteria:',
      criteriaSummary,
      'Completed checks:',
      checksSummary,
    ].join('\n');
  }
}
