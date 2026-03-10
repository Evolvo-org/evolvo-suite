import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AgentInputContract,
  CreateUsageEventRequest,
  ExecutePlanningRequest,
  ExecutePlanningResponse,
  PlanningAgentEpicRecord,
  PlanningGeneratedResultInput,
  PlanningAgentTaskRecord,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { DevelopmentPlansService } from '../development-plans/development-plans.service.js';
import { WorkflowService } from '../workflow/workflow.service.js';
import { AgentsService } from './agents.service.js';
import { UsageService } from '../usage/usage.service.js';

type PrismaWorkItemPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

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

const toPrismaPriority = (value: PrismaWorkItemPriority): PrismaWorkItemPriority => {
  switch (value) {
    case 'LOW':
    case 'HIGH':
    case 'URGENT':
      return value;
    default:
      return 'MEDIUM';
  }
};

@Injectable()
export class PlanningAgentService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(DevelopmentPlansService)
    private readonly developmentPlansService: DevelopmentPlansService,
    @Inject(WorkflowService)
    private readonly workflowService: WorkflowService,
    @Inject(AgentsService)
    private readonly agentsService: AgentsService,
    @Inject(UsageService)
    private readonly usageService: UsageService,
  ) {}

  public async executePlanning(
    projectId: string,
    workItemId: string,
    payload: ExecutePlanningRequest,
  ): Promise<ExecutePlanningResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const [workItem, project, route] = await Promise.all([
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
    ]);

    if (!workItem || !project || !project.repository) {
      throw new NotFoundException('Planning work item not found.');
    }

    if (!project.developmentPlan?.activeVersion) {
      throw new BadRequestException(
        'An active development plan version is required before planning can execute.',
      );
    }

    const duplicate = await this.findDuplicatePlannedWork(
      projectId,
      workItemId,
      workItem.title,
    );

    const input = this.buildInput(
      projectId,
      workItemId,
      {
        ...project,
        developmentPlan: project.developmentPlan,
      },
      route,
      payload.runtimeId,
      payload.leaseId,
    );
    const promptSnapshot = payload.generatedResult
      ? {
          systemPrompt: payload.generatedResult.systemPrompt,
          userPrompt: payload.generatedResult.userPrompt,
        }
      : this.buildPromptSnapshot(project.name, workItem.title, workItem.description);
    const usagePayload = payload.generatedResult
      ? null
      : this.buildUsagePayload(route.provider, route.model, promptSnapshot.userPrompt);
    const run = await this.agentsService.createAgentRun(projectId, workItemId, {
      agentType: 'planning',
      runtimeId: payload.runtimeId,
      leaseId: payload.leaseId,
      status: 'completed',
      completedAt: new Date().toISOString(),
      summary: payload.generatedResult
        ? payload.generatedResult.accepted
          ? `Planning agent accepted and decomposed planning request: ${workItem.title}`
          : `Planning agent rejected planning request: ${workItem.title}`
        : duplicate
          ? `Planning agent rejected duplicate planning request: ${workItem.title}`
          : `Planning agent accepted and decomposed planning request: ${workItem.title}`,
    });

    await this.agentsService.upsertPromptSnapshot(projectId, workItemId, run.id, {
      systemPrompt: promptSnapshot.systemPrompt,
      userPrompt: promptSnapshot.userPrompt,
    });

    if (duplicate) {
      const comment = `Planning agent rejected this planning request because similar planned work already exists: ${duplicate.title}.`;
      await this.agentsService.createDecision(projectId, workItemId, run.id, {
        decision: 'Reject duplicate planning request.',
        rationale: comment,
      });
      await this.workflowService.createWorkItemComment(projectId, workItemId, {
        actorType: 'agent',
        actorName: 'Planning agent',
        content: comment,
      });
      await this.workflowService.transitionWorkItem(projectId, workItemId, {
        toState: 'requiresHumanIntervention',
        reason: comment,
      });

      const usageEvent = usagePayload
        ? await this.usageService.createUsageEvent(projectId, {
            ...usagePayload,
            runtimeId: payload.runtimeId,
            workItemId,
            agentRunId: run.id,
          })
        : null;

      return {
        projectId,
        sourceWorkItemId: workItemId,
        accepted: false,
        route,
        input,
        runId: run.id,
        usageEventId: usageEvent?.id ?? null,
        epicId: null,
        epicTitle: null,
        epics: [],
        createdTaskIds: [],
        promotedToReadyForDevIds: [],
        comment,
        tasks: [],
      };
    }

    if (payload.generatedResult) {
      return this.applyGeneratedPlanningResult({
        projectId,
        workItemId,
        projectName: project.name,
        workItemTitle: workItem.title,
        workItemDescription: workItem.description,
        workItemPriority: workItem.priority,
        developmentPlanId: project.developmentPlan.id,
        route,
        input,
        runId: run.id,
        runtimeId: payload.runtimeId,
        generatedResult: payload.generatedResult,
      });
    }

    const epic = await this.ensurePlannedEpic(
      projectId,
      project.developmentPlan.id,
      workItem.title,
    );

    await this.prisma.workItem.update({
      where: { id: workItemId },
      data: {
        epicId: epic.id,
        title: toCorePhrase(workItem.title),
        description:
          workItem.description ??
          `Planned from planning request for ${project.name}.`,
      },
    });

    await this.clearPlanningApproval(projectId);

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
          description: `Generated by the planning agent from planning request ${workItem.title}.`,
          priority: workItem.priority,
          sortOrder: index,
        },
      });

      await this.ensureAcceptanceCriteria(projectId, subtask.id, [
        `${title} has a clear implementation scope.`,
        `${title} records evidence of completion.`,
      ]);

      createdSubtasks.push({
        workItemId: subtask.id,
        epicId: epic.id,
        epicTitle: epic.title,
        title: subtask.title,
        state: 'planning',
        acceptanceCriteriaCount: 2,
      });
    }

    const promotedToReadyForDevIds: string[] = [];

    const comment =
      `Planning agent accepted this planning request, created ${createdSubtasks.length} subtasks, and is awaiting operator approval before execution can begin.`;

    await this.agentsService.createDecision(projectId, workItemId, run.id, {
      decision: 'Accept planning request and decompose into executable work.',
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

    if (!usagePayload) {
      throw new BadRequestException('Planning usage payload is required for live planning execution.');
    }

    const usageEvent = await this.usageService.createUsageEvent(projectId, {
      agentType: usagePayload.agentType,
      provider: usagePayload.provider,
      model: usagePayload.model,
      inputTokens: usagePayload.inputTokens,
      outputTokens: usagePayload.outputTokens,
      totalTokens: usagePayload.totalTokens,
      estimatedCostUsd: usagePayload.estimatedCostUsd,
      occurredAt: usagePayload.occurredAt,
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
      epics: [
        {
          epicId: epic.id,
          title: epic.title,
          taskIds: [workItemId, ...createdSubtasks.map((item) => item.workItemId)],
        },
      ],
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
    route: ExecutePlanningResponse['route'],
    runtimeId?: string,
    leaseId?: string,
  ): AgentInputContract {
    return {
      agentType: 'planning',
      projectId,
      workItemId,
      runtimeId,
      leaseId,
      goal: `Expand planning work item ${workItemId} for ${project.name} into executable backlog items.`,
      context: [
        {
          kind: 'workItem',
          id: workItemId,
          title: 'Planning request',
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

  private buildPromptSnapshot(
    projectName: string,
    title: string,
    description: string | null,
  ) {
    return {
      systemPrompt:
        'You are the planning agent. Evaluate planning requests, reject duplicates, and decompose accepted work into execution-ready backlog items.',
      userPrompt: this.buildPrompt(projectName, title, description),
    };
  }

  private buildPrompt(
    projectName: string,
    title: string,
    description: string | null,
  ): string {
    return [
      `Project: ${projectName}`,
      `Planning request: ${title}`,
      `Description: ${description ?? 'No detailed description provided.'}`,
      'Decide whether this planning request should be accepted or rejected.',
      'If accepted, break it into actionable subtasks and define validation expectations.',
    ].join('\n');
  }

  private async applyGeneratedPlanningResult(input: {
    projectId: string;
    workItemId: string;
    projectName: string;
    workItemTitle: string;
    workItemDescription: string | null;
    workItemPriority: PrismaWorkItemPriority;
    developmentPlanId: string | null;
    route: ExecutePlanningResponse['route'];
    generatedResult: PlanningGeneratedResultInput;
    input: AgentInputContract;
    runId: string;
    runtimeId?: string;
  }): Promise<ExecutePlanningResponse> {
    const generatedEpics = input.generatedResult.epics ?? [];

    if (!input.generatedResult.accepted) {
      const comment = input.generatedResult.decisionSummary.trim();

      await this.agentsService.createDecision(
        input.projectId,
        input.workItemId,
        input.runId,
        {
          decision: 'Reject planning request.',
          rationale: comment,
        },
      );
      await this.workflowService.createWorkItemComment(
        input.projectId,
        input.workItemId,
        {
          actorType: 'agent',
          actorName: 'Planning agent',
          content: comment,
        },
      );
      await this.workflowService.transitionWorkItem(input.projectId, input.workItemId, {
        toState: 'requiresHumanIntervention',
        reason: comment,
      });

      return {
        projectId: input.projectId,
        sourceWorkItemId: input.workItemId,
        accepted: false,
        route: input.route,
        input: input.input,
        runId: input.runId,
        usageEventId: null,
        epicId: null,
        epicTitle: null,
        epics: [],
        createdTaskIds: [],
        promotedToReadyForDevIds: [],
        comment,
        tasks: [],
      };
    }

    const persistedTasks: PlanningAgentTaskRecord[] = [];
    const createdTaskIds: string[] = [];
    const persistedEpics: PlanningAgentEpicRecord[] = [];
    let primaryEpicId: string | null = null;
    let primaryEpicTitle: string | null = null;
    let sourceTaskAssigned = false;

    for (const generatedEpic of generatedEpics) {
      const epic = await this.ensureEpic(
        input.projectId,
        input.developmentPlanId,
        generatedEpic.title.trim(),
        generatedEpic.summary?.trim() ||
          `Generated by the planning agent from planning request ${input.workItemTitle}.`,
      );
      const epicTaskIds: string[] = [];
      let nextSortOrder = await this.prisma.workItem.count({
        where: {
          projectId: input.projectId,
          epicId: epic.id,
          parentId: null,
        },
      });

      if (primaryEpicId === null) {
        primaryEpicId = epic.id;
        primaryEpicTitle = epic.title;
      }

      for (const task of generatedEpic.tasks) {
        const acceptanceCriteria =
          task.acceptanceCriteria.length > 0
            ? task.acceptanceCriteria
            : this.buildDefaultAcceptanceCriteria(task.title.trim());

        if (!sourceTaskAssigned) {
          await this.prisma.workItem.update({
            where: { id: input.workItemId },
            data: {
              epicId: epic.id,
              parentId: null,
              kind: 'TASK',
              title: task.title.trim(),
              description:
                task.description?.trim() ||
                input.workItemDescription ||
                `Planned from planning request for ${input.projectName}.`,
              priority: toPrismaPriority(input.workItemPriority),
              sortOrder: nextSortOrder,
            },
          });
          await this.clearPlanningApproval(input.projectId);
          await this.ensureAcceptanceCriteria(
            input.projectId,
            input.workItemId,
            acceptanceCriteria.length > 0
              ? acceptanceCriteria
              : planningAcceptanceCriteria,
          );

          persistedTasks.push({
            workItemId: input.workItemId,
            epicId: epic.id,
            epicTitle: epic.title,
            title: task.title.trim(),
            state: 'planning',
            acceptanceCriteriaCount: acceptanceCriteria.length,
          });
          epicTaskIds.push(input.workItemId);
          sourceTaskAssigned = true;
          nextSortOrder += 1;
          continue;
        }

        const createdTask = await this.prisma.workItem.create({
          data: {
            projectId: input.projectId,
            epicId: epic.id,
            parentId: null,
            kind: 'TASK',
            title: task.title.trim(),
            description:
              task.description?.trim() ||
              `Generated by the planning agent from planning request ${input.workItemTitle}.`,
            priority: toPrismaPriority(input.workItemPriority),
            sortOrder: nextSortOrder,
          },
        });
        await this.ensureAcceptanceCriteria(
          input.projectId,
          createdTask.id,
          acceptanceCriteria,
        );

        persistedTasks.push({
          workItemId: createdTask.id,
          epicId: epic.id,
          epicTitle: epic.title,
          title: createdTask.title,
          state: 'planning',
          acceptanceCriteriaCount: acceptanceCriteria.length,
        });
        createdTaskIds.push(createdTask.id);
        epicTaskIds.push(createdTask.id);
        nextSortOrder += 1;
      }

      persistedEpics.push({
        epicId: epic.id,
        title: epic.title,
        taskIds: epicTaskIds,
      });
    }

    const comment = input.generatedResult.decisionSummary.trim();

    await this.agentsService.createDecision(input.projectId, input.workItemId, input.runId, {
      decision: 'Accept planning request and decompose into executable work.',
      rationale: comment,
    });

    await this.agentsService.createArtifact(input.projectId, input.workItemId, input.runId, {
      artifactType: 'plan',
      label: 'Planning decomposition',
      content: JSON.stringify(
        {
          epics: persistedEpics,
          tasks: persistedTasks,
          promotedToReadyForDevIds: [],
          ambiguityNotes: generatedEpics.map((epic) => ({
            title: epic.title,
            tasks: epic.tasks.map((task) => ({
              title: task.title,
              notes: task.ambiguityNotes ?? [],
            })),
          })),
        },
        null,
        2,
      ),
    });

    await this.workflowService.createWorkItemComment(input.projectId, input.workItemId, {
      actorType: 'agent',
      actorName: 'Planning agent',
      content: comment,
    });

    return {
      projectId: input.projectId,
      sourceWorkItemId: input.workItemId,
      accepted: true,
      route: input.route,
      input: input.input,
      runId: input.runId,
      usageEventId: null,
      epicId: primaryEpicId,
      epicTitle: primaryEpicTitle,
      epics: persistedEpics,
      createdTaskIds,
      promotedToReadyForDevIds: [],
      comment,
      tasks: persistedTasks,
    };
  }

  private buildDefaultAcceptanceCriteria(title: string): string[] {
    return [
      `${title} has a clear implementation scope.`,
      `${title} records evidence of completion.`,
    ];
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
    requestTitle: string,
  ) {
    return this.ensureEpic(
      projectId,
      developmentPlanId,
      toEpicTitle(requestTitle),
      `Generated by the planning agent from planning request ${requestTitle}.`,
    );
  }

  private async ensureEpic(
    projectId: string,
    developmentPlanId: string | null,
    epicTitle: string,
    summary: string,
  ) {
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
        summary,
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

  private async clearPlanningApproval(projectId: string): Promise<void> {
    await this.developmentPlansService.clearPlanningApproval(projectId, {
      actorName: 'Planning agent',
      summary: 'Planning agent decomposition changed the approved plan state.',
    });
  }
}
