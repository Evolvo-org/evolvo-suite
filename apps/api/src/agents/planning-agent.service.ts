import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AgentInputContract,
  CreateUsageEventRequest,
  PlanningAgentTaskRecord,
  TriageInboxIdeaRequest,
  TriageInboxIdeaResponse,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { WorkflowService } from '../workflow/workflow.service.js';
import { AgentsService } from './agents.service.js';
import { UsageService } from '../usage/usage.service.js';

const planningAcceptanceCriteria = [
  'The decomposed work clearly describes the intended outcome.',
  'Execution steps and validation expectations are captured.',
] as const;

const toCorePhrase = (title: string): string => {
  return title
    .trim()
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
};

const toEpicTitle = (title: string): string => {
  const normalized = toCorePhrase(title);
  return normalized.length > 0 ? normalized : 'Planned work';
};

@Injectable()
export class PlanningAgentService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(WorkflowService)
    private readonly workflowService: WorkflowService,
    @Inject(AgentsService)
    private readonly agentsService: AgentsService,
    @Inject(UsageService)
    private readonly usageService: UsageService,
  ) {}

  public async triageInboxIdea(
    projectId: string,
    workItemId: string,
    payload: TriageInboxIdeaRequest,
  ): Promise<TriageInboxIdeaResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const [workItem, project, route, queueLimits] = await Promise.all([
      this.prisma.workItem.findFirst({
        where: { id: workItemId, projectId },
        include: {
          epic: true,
          acceptanceCriteria: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      }),
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
      this.projectsService.resolveProjectAgentRoute(projectId, 'planning'),
      this.projectsService.getProjectQueueLimits(projectId),
    ]);

    if (!workItem || !project || !project.repository) {
      throw new NotFoundException('Inbox work item not found.');
    }

    const duplicate = await this.findDuplicatePlannedWork(
      projectId,
      workItemId,
      workItem.title,
    );

    const developmentPlan = duplicate
      ? project.developmentPlan
      : await this.ensureDevelopmentPlan(
          projectId,
          project.name,
          workItem.title,
          workItem.description,
          project.productSpec?.content,
          project.developmentPlan,
        );

    const input = this.buildInput(
      projectId,
      workItemId,
      {
        ...project,
        developmentPlan,
      },
      route,
      payload.runtimeId,
    );
    const prompt = this.buildPrompt(project.name, workItem.title, workItem.description);
    const usagePayload = this.buildUsagePayload(route.provider, route.model, prompt);
    const run = await this.agentsService.createAgentRun(projectId, workItemId, {
      agentType: 'planning',
      runtimeId: payload.runtimeId,
      status: 'completed',
      completedAt: new Date().toISOString(),
      summary: duplicate
        ? `Planning agent rejected duplicate inbox idea: ${workItem.title}`
        : `Planning agent accepted and decomposed inbox idea: ${workItem.title}`,
    });

    await this.agentsService.upsertPromptSnapshot(projectId, workItemId, run.id, {
      systemPrompt:
        'You are the planning agent. Triage inbox ideas, reject duplicates, and decompose accepted work into execution-ready backlog items.',
      userPrompt: prompt,
    });

    if (duplicate) {
      const comment = `Planning agent rejected this inbox idea because similar planned work already exists: ${duplicate.title}.`;
      await this.agentsService.createDecision(projectId, workItemId, run.id, {
        decision: 'Reject duplicate inbox idea.',
        rationale: comment,
      });
      await this.workflowService.createWorkItemComment(projectId, workItemId, {
        actorType: 'agent',
        actorName: 'Planning agent',
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
        sourceWorkItemId: workItemId,
        accepted: false,
        route,
        input,
        runId: run.id,
        usageEventId: usageEvent.id,
        epicId: null,
        epicTitle: null,
        createdTaskIds: [],
        promotedToReadyForDevIds: [],
        comment,
        tasks: [],
      };
    }

    const epic = await this.ensurePlannedEpic(
      projectId,
      developmentPlan?.id ?? null,
      workItem.title,
    );

    await this.prisma.workItem.update({
      where: { id: workItemId },
      data: {
        epicId: epic.id,
        title: toCorePhrase(workItem.title),
        description:
          workItem.description ??
          `Planned from inbox idea for ${project.name}.`,
      },
    });

    await this.workflowService.transitionWorkItem(projectId, workItemId, {
      toState: 'planning',
      reason: 'Planning agent accepted the inbox idea and started decomposition.',
    });

    await this.ensureAcceptanceCriteria(projectId, workItemId, planningAcceptanceCriteria);

    const subtaskTitles = this.buildSubtasks(workItem.title);
    const createdSubtasks: PlanningAgentTaskRecord[] = [];

    for (const [index, title] of subtaskTitles.entries()) {
      const subtask = await this.prisma.workItem.create({
        data: {
          projectId,
          epicId: epic.id,
          parentId: workItemId,
          kind: 'SUBTASK',
          title,
          description: `Generated by the planning agent from inbox idea ${workItem.title}.`,
          priority: workItem.priority,
          sortOrder: index,
        },
      });

      await this.workflowService.transitionWorkItem(projectId, subtask.id, {
        toState: 'planning',
        reason: 'Planning agent decomposed the accepted inbox idea into executable subtask work.',
      });

      await this.ensureAcceptanceCriteria(projectId, subtask.id, [
        `${title} has a clear implementation scope.`,
        `${title} records evidence of completion.`,
      ]);

      createdSubtasks.push({
        workItemId: subtask.id,
        title: subtask.title,
        state: 'planning',
        acceptanceCriteriaCount: 2,
      });
    }

    const availableReadySlots = await this.getAvailableReadyForDevSlots(
      projectId,
      queueLimits.effective.maxReadyForDev,
    );
    const promotedToReadyForDevIds: string[] = [];

    for (const subtask of createdSubtasks.slice(0, availableReadySlots)) {
      await this.workflowService.transitionWorkItem(projectId, subtask.workItemId, {
        toState: 'readyForDev',
        reason: 'Planning agent filled ready-for-dev capacity with newly decomposed work.',
      });
      subtask.state = 'readyForDev';
      promotedToReadyForDevIds.push(subtask.workItemId);
    }

    const comment =
      promotedToReadyForDevIds.length > 0
        ? `Planning agent accepted this idea, created ${createdSubtasks.length} subtasks, and promoted ${promotedToReadyForDevIds.length} item(s) to ready for dev.`
        : `Planning agent accepted this idea and created ${createdSubtasks.length} subtasks.`;

    await this.agentsService.createDecision(projectId, workItemId, run.id, {
      decision: 'Accept inbox idea and decompose into executable work.',
      rationale: comment,
    });

    await this.agentsService.createArtifact(projectId, workItemId, run.id, {
      artifactType: 'plan',
      label: 'Planning decomposition',
      content: JSON.stringify(
        {
          epicId: epic.id,
          epicTitle: epic.title,
          createdSubtasks,
          promotedToReadyForDevIds,
        },
        null,
        2,
      ),
    });

    await this.workflowService.createWorkItemComment(projectId, workItemId, {
      actorType: 'agent',
      actorName: 'Planning agent',
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
      sourceWorkItemId: workItemId,
      accepted: true,
      route,
      input,
      runId: run.id,
      usageEventId: usageEvent.id,
      epicId: epic.id,
      epicTitle: epic.title,
      createdTaskIds: createdSubtasks.map((item) => item.workItemId),
      promotedToReadyForDevIds,
      comment,
      tasks: createdSubtasks,
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
    route: TriageInboxIdeaResponse['route'],
    runtimeId?: string,
  ): AgentInputContract {
    return {
      agentType: 'planning',
      projectId,
      workItemId,
      runtimeId,
      goal: `Triage inbox work item ${workItemId} for ${project.name} and decompose accepted work into executable backlog items.`,
      context: [
        {
          kind: 'workItem',
          id: workItemId,
          title: 'Inbox idea',
        },
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
      ],
      metadata: {
        routeProvider: route.provider,
        routeModel: route.model,
        repository: `${project.repository?.owner ?? 'unknown'}/${project.repository?.name ?? 'unknown'}`,
      },
    };
  }

  private async ensureDevelopmentPlan(
    projectId: string,
    projectName: string,
    ideaTitle: string,
    ideaDescription: string | null,
    productSpecContent: string | undefined,
    existingPlan:
      | {
          id: string;
          title: string;
          activeVersion: { versionNumber: number } | null;
        }
      | null,
  ) {
    if (existingPlan) {
      return existingPlan;
    }

    const title = 'Generated delivery plan';
    const content = [
      `Project: ${projectName}`,
      `Seed idea: ${ideaTitle}`,
      `Idea description: ${ideaDescription ?? 'No detailed description provided.'}`,
      'Execution phases:',
      `1. Define scope and dependencies for ${ideaTitle}.`,
      `2. Implement and validate ${ideaTitle}.`,
      productSpecContent ? `Product spec context: ${productSpecContent.slice(0, 400)}` : null,
    ]
      .filter((value): value is string => value !== null)
      .join('\n');

    return this.prisma.$transaction(async (transaction) => {
      const plan = await transaction.developmentPlan.create({
        data: {
          projectId,
          title,
        },
      });

      const version = await transaction.planVersion.create({
        data: {
          developmentPlanId: plan.id,
          versionNumber: 1,
          title,
          content,
          summary: `Generated by the planning agent while triaging ${ideaTitle}.`,
        },
      });

      await transaction.developmentPlan.update({
        where: { id: plan.id },
        data: {
          activeVersionId: version.id,
        },
      });

      return {
        id: plan.id,
        title: plan.title,
        activeVersion: {
          versionNumber: version.versionNumber,
        },
      };
    });
  }

  private buildPrompt(
    projectName: string,
    title: string,
    description: string | null,
  ): string {
    return [
      `Project: ${projectName}`,
      `Inbox idea: ${title}`,
      `Description: ${description ?? 'No detailed description provided.'}`,
      'Decide whether this idea should be accepted or rejected.',
      'If accepted, break it into actionable subtasks and define validation expectations.',
    ].join('\n');
  }

  private buildUsagePayload(
    provider: string,
    model: string,
    prompt: string,
  ): CreateUsageEventRequest {
    const inputTokens = Math.max(24, Math.ceil(prompt.length / 4));
    const outputTokens = Math.max(32, Math.ceil(prompt.length / 8));

    return {
      agentType: 'planning',
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  private async findDuplicatePlannedWork(
    projectId: string,
    workItemId: string,
    title: string,
  ) {
    return this.prisma.workItem.findFirst({
      where: {
        projectId,
        id: { not: workItemId },
        state: {
          in: ['PLANNING', 'READY_FOR_DEV', 'IN_DEV', 'READY_FOR_REVIEW', 'IN_REVIEW', 'READY_FOR_RELEASE'],
        },
        title: {
          equals: title.trim(),
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        title: true,
      },
    });
  }

  private async ensurePlannedEpic(
    projectId: string,
    developmentPlanId: string | null,
    ideaTitle: string,
  ) {
    const epicTitle = toEpicTitle(ideaTitle);
    const existing = await this.prisma.epic.findFirst({
      where: {
        projectId,
        title: epicTitle,
      },
    });

    if (existing) {
      return existing;
    }

    const sortOrder = await this.prisma.epic.count({ where: { projectId } });

    return this.prisma.epic.create({
      data: {
        projectId,
        developmentPlanId,
        title: epicTitle,
        summary: `Generated by the planning agent from inbox idea ${ideaTitle}.`,
        sortOrder,
      },
    });
  }

  private buildSubtasks(title: string): string[] {
    const core = toCorePhrase(title);

    return [
      `Define implementation scope for ${core}`,
      `Implement and verify ${core}`,
    ];
  }

  private async ensureAcceptanceCriteria(
    projectId: string,
    workItemId: string,
    criteria: readonly string[],
  ): Promise<void> {
    const existingCount = await this.prisma.acceptanceCriterion.count({
      where: { workItemId },
    });

    if (existingCount > 0) {
      return;
    }

    await this.prisma.acceptanceCriterion.createMany({
      data: criteria.map((text, index) => ({
        workItemId,
        text,
        isComplete: false,
        sortOrder: index,
      })),
    });
  }

  private async getAvailableReadyForDevSlots(
    projectId: string,
    maxReadyForDev: number,
  ): Promise<number> {
    const currentReadyForDev = await this.prisma.workItem.count({
      where: {
        projectId,
        state: 'READY_FOR_DEV',
      },
    });

    return Math.max(0, maxReadyForDev - currentReadyForDev);
  }
}
