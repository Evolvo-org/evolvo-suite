import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateUsageEventRequest, GenerateInboxIdeasRequest, GenerateInboxIdeasResponse, InboxIdeaCandidate, InboxContextSummary, WorkItemPriority } from '@repo/shared';
import { inboxIdeaCandidatesSchema } from '@repo/validation';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { AgentsService } from './agents.service.js';
import { UsageService } from '../usage/usage.service.js';

const defaultIdeaCount = 3;
const autoInboxEpicTitle = 'Inbox ideas';

const toPriorityLabel = (value: string): WorkItemPriority => {
  const normalized = value.toLowerCase();

  if (/(critical|security|billing|auth|payment|compliance)/.test(normalized)) {
    return 'high';
  }

  if (/(release|review|runtime|scheduler|observability|monitor|usage|analytics)/.test(normalized)) {
    return 'medium';
  }

  return 'low';
};

const toPrismaPriority = (value: WorkItemPriority) => {
  switch (value) {
    case 'low':
      return 'LOW' as const;
    case 'high':
      return 'HIGH' as const;
    case 'urgent':
      return 'URGENT' as const;
    default:
      return 'MEDIUM' as const;
  }
};

const splitIntoSignals = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(/\n|\.|;|•|\*/g)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 12)
    .slice(0, 8);
};

const toTitleFromSignal = (signal: string, projectName: string): string => {
  const sanitized = signal.replace(/^[^a-z0-9]+/i, '').trim();
  const words = sanitized.split(/\s+/).slice(0, 8);
  const titleCore = words
    .join(' ')
    .replace(/[,:;]+$/g, '')
    .trim();

  if (!titleCore) {
    return `Explore next step for ${projectName}`;
  }

  return titleCore.charAt(0).toUpperCase() + titleCore.slice(1);
};

@Injectable()
export class InboxAgentService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(AgentsService)
    private readonly agentsService: AgentsService,
    @Inject(UsageService)
    private readonly usageService: UsageService,
  ) {}

  public async generateIdeas(
    projectId: string,
    payload: GenerateInboxIdeasRequest,
  ): Promise<GenerateInboxIdeasResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const [project, route, counts] = await Promise.all([
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
      this.projectsService.resolveProjectAgentRoute(projectId, 'inbox'),
      this.prisma.workItem.groupBy({
        by: ['state'],
        where: { projectId },
        _count: { _all: true },
      }),
    ]);

    if (!project || !project.repository) {
      throw new NotFoundException('Project repository metadata not found.');
    }

    const maxIdeas = payload.maxIdeas ?? defaultIdeaCount;
    const sourceSignals = this.buildSourceSignals({
      productSpec: project.productSpec?.content,
      developmentPlan: project.developmentPlan?.activeVersion?.content,
      repository: `${project.repository.owner}/${project.repository.name}`,
      projectName: project.name,
    });

    const candidates = inboxIdeaCandidatesSchema.parse(
      this.buildCandidates(project.name, sourceSignals, maxIdeas),
    );

    const epic = await this.ensureInboxEpic(projectId, project.developmentPlan?.id ?? null);
    const prompt = this.buildPrompt({
      projectName: project.name,
      repository: `${project.repository.owner}/${project.repository.name}`,
      productSpec: project.productSpec?.content ?? null,
      developmentPlan: project.developmentPlan?.activeVersion?.content ?? null,
      signals: sourceSignals,
      maxIdeas,
    });

    const usagePayload = this.buildUsagePayload(
      route.provider,
      route.model,
      prompt.userPrompt,
      candidates,
    );
    const persistedItems = [] as GenerateInboxIdeasResponse['items'];

    for (const candidate of candidates) {
      const created = await this.prisma.workItem.create({
        data: {
          projectId,
          epicId: epic.id,
          parentId: null,
          kind: 'TASK',
          title: candidate.title,
          description: candidate.description,
          priority: toPrismaPriority(candidate.priority),
          sortOrder: await this.nextSortOrder(projectId, epic.id),
        },
      });

      const run = await this.agentsService.createAgentRun(projectId, created.id, {
        agentType: 'inbox',
        runtimeId: payload.runtimeId,
        status: 'completed',
        completedAt: new Date().toISOString(),
        summary: `Inbox agent generated candidate idea: ${candidate.title}`,
      });

      await this.agentsService.upsertPromptSnapshot(projectId, created.id, run.id, {
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        messagesJson: JSON.stringify(prompt.messages, null, 2),
      });

      await this.agentsService.createDecision(projectId, created.id, run.id, {
        decision: candidate.rationale,
        rationale: `Generated from ${candidate.sourceSignals.join('; ')}`,
      });

      await this.agentsService.createArtifact(projectId, created.id, run.id, {
        artifactType: 'report',
        label: 'Inbox candidate analysis',
        content: JSON.stringify(candidate, null, 2),
      });

      const usageEvent = await this.usageService.createUsageEvent(projectId, {
        ...usagePayload,
        runtimeId: payload.runtimeId,
        workItemId: created.id,
        agentRunId: run.id,
      });

      persistedItems.push({
        workItemId: created.id,
        epicId: epic.id,
        runId: run.id,
        usageEventId: usageEvent.id,
        title: created.title,
        priority: candidate.priority,
        state: 'inbox',
      });
    }

    const context = this.buildContextSummary({
      projectName: project.name,
      repository: `${project.repository.owner}/${project.repository.name}`,
      productSpecVersion: project.productSpec?.version ?? null,
      developmentPlanVersion: project.developmentPlan?.activeVersion?.versionNumber ?? null,
      developmentPlanTitle: project.developmentPlan?.title ?? null,
      sourceSignalCount: sourceSignals.length,
      epicId: epic.id,
      epicTitle: epic.title,
      counts,
    });

    return {
      projectId,
      route,
      context,
      input: {
        agentType: 'inbox',
        projectId,
        runtimeId: payload.runtimeId,
        goal: `Generate up to ${maxIdeas} validated inbox candidates for ${project.name}.`,
        instructions: prompt.userPrompt,
        context: [
          {
            kind: 'productSpec',
            id: project.productSpec?.id ?? 'missing-product-spec',
            title: `Product spec v${project.productSpec?.version ?? 0}`,
          },
          {
            kind: 'developmentPlan',
            id: project.developmentPlan?.id ?? 'missing-development-plan',
            title: project.developmentPlan?.title ?? 'No active development plan',
          },
          {
            kind: 'artifact',
            id: epic.id,
            title: epic.title,
          },
        ],
        metadata: {
          routeProvider: route.provider,
          routeModel: route.model,
          sourceSignalCount: String(sourceSignals.length),
        },
      },
      candidates,
      items: persistedItems,
    };
  }

  private buildSourceSignals(params: {
    productSpec?: string | null;
    developmentPlan?: string | null;
    repository: string;
    projectName: string;
  }): string[] {
    const signals = [
      ...splitIntoSignals(params.productSpec),
      ...splitIntoSignals(params.developmentPlan),
      `Repository ${params.repository} is active for project ${params.projectName}.`,
      'Generate backlog candidates that can later be triaged by the planning agent.',
    ];

    return [...new Set(signals)].slice(0, 6);
  }

  private buildCandidates(
    projectName: string,
    signals: string[],
    maxIdeas: number,
  ): InboxIdeaCandidate[] {
    return signals.slice(0, maxIdeas).map((signal, index) => ({
      title: toTitleFromSignal(signal, projectName),
      description: `Candidate opportunity for ${projectName}: ${signal}. Capture this in inbox so the planning lane can accept, reject, or decompose it.`,
      priority: index === 0 ? 'high' : toPriorityLabel(signal),
      rationale:
        `Signal ${index + 1} indicates a plausible next unit of product or platform work that should be triaged.`,
      sourceSignals: [signal],
    }));
  }

  private buildPrompt(params: {
    projectName: string;
    repository: string;
    productSpec: string | null;
    developmentPlan: string | null;
    signals: string[];
    maxIdeas: number;
  }) {
    const systemPrompt =
      'You are the inbox agent. Generate concise, actionable candidate ideas that should enter the Inbox lane for later planning triage.';
    const userPrompt = [
      `Project: ${params.projectName}`,
      `Repository: ${params.repository}`,
      `Max ideas: ${params.maxIdeas}`,
      'Use the following source signals to propose candidate inbox work:',
      ...params.signals.map((signal, index) => `${index + 1}. ${signal}`),
      'Return only actionable ideas that can later be accepted, rejected, or decomposed by the planning agent.',
    ].join('\n');

    return {
      systemPrompt,
      userPrompt,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
        {
          role: 'context',
          content: JSON.stringify(
            {
              productSpec: params.productSpec,
              developmentPlan: params.developmentPlan,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private buildUsagePayload(
    provider: string,
    model: string,
    prompt: string,
    candidates: InboxIdeaCandidate[],
  ): CreateUsageEventRequest {
    const promptTokensTotal = Math.max(32, Math.ceil(prompt.length / 4));
    const completionTokensTotal = Math.max(
      24,
      Math.ceil(JSON.stringify(candidates).length / 4),
    );
    const divisor = Math.max(1, candidates.length);
    const promptTokens = Math.max(1, Math.ceil(promptTokensTotal / divisor));
    const completionTokens = Math.max(1, Math.ceil(completionTokensTotal / divisor));

    return {
      agentType: 'inbox',
      provider,
      model,
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  private buildContextSummary(params: {
    projectName: string;
    repository: string;
    productSpecVersion: number | null;
    developmentPlanVersion: number | null;
    developmentPlanTitle: string | null;
    sourceSignalCount: number;
    epicId: string;
    epicTitle: string;
    counts: Array<{ state: string; _count: { _all: number } }>;
  }): InboxContextSummary {
    const existingInboxCount = params.counts.find((item) => item.state === 'INBOX')?._count._all ?? 0;
    const totalBacklogCount = params.counts.reduce(
      (sum, item) => sum + item._count._all,
      0,
    );

    return {
      projectName: params.projectName,
      repository: params.repository,
      productSpecVersion: params.productSpecVersion,
      developmentPlanVersion: params.developmentPlanVersion,
      developmentPlanTitle: params.developmentPlanTitle,
      existingInboxCount,
      totalBacklogCount,
      sourceSignalCount: params.sourceSignalCount,
      epicId: params.epicId,
      epicTitle: params.epicTitle,
    };
  }

  private async ensureInboxEpic(projectId: string, developmentPlanId: string | null) {
    const existing = await this.prisma.epic.findFirst({
      where: {
        projectId,
        title: autoInboxEpicTitle,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    if (existing) {
      return existing;
    }

    const sortOrder = await this.prisma.epic.count({
      where: { projectId },
    });

    return this.prisma.epic.create({
      data: {
        projectId,
        developmentPlanId,
        title: autoInboxEpicTitle,
        summary: 'Auto-generated candidate ideas awaiting planning triage.',
        sortOrder,
      },
    });
  }

  private async nextSortOrder(projectId: string, epicId: string): Promise<number> {
    return this.prisma.workItem.count({
      where: {
        projectId,
        epicId,
        parentId: null,
      },
    });
  }
}
