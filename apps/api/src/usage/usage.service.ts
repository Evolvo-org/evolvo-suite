import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateUsageEventRequest,
  UsageEventRecord,
  UsageSummaryResponse,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { LogsService } from '../logs/logs.service.js';

import { mapUsageEvent, mapUsageSummary } from './usage.mapper.js';

const providerAliases: Record<string, string> = {
  openai: 'openai',
  'open-ai': 'openai',
  codex: 'codex',
  'codex sdk': 'codex',
  'codex-sdk': 'codex',
  github: 'codex',
  'github-copilot': 'codex',
};

const modelPricingPer1kTokens: Record<string, { input: number; output: number }> = {
  'openai:gpt-5.4': { input: 0.01, output: 0.03 },
  'openai:gpt-5.4-mini': { input: 0.002, output: 0.006 },
  'codex:codex-mini-latest': { input: 0.0015, output: 0.006 },
  'codex:codex-latest': { input: 0.015, output: 0.06 },
};

@Injectable()
export class UsageService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(LogsService)
    private readonly logsService: LogsService,
  ) {}

  public async createUsageEvent(
    projectId: string,
    payload: CreateUsageEventRequest,
  ): Promise<UsageEventRecord> {
    await this.projectsService.ensureProjectExists(projectId);
    await this.assertWorkItemIfProvided(projectId, payload.workItemId);
    await this.assertAgentRunIfProvided(projectId, payload.workItemId, payload.agentRunId);
    await this.assertRuntimeIfProvided(payload.runtimeId);

    const provider = this.normalizeProvider(payload.provider);
    const model = this.normalizeModel(payload.model);
    const inputTokens = payload.inputTokens ?? 0;
    const outputTokens = payload.outputTokens ?? 0;
    const totalTokens = payload.totalTokens ?? inputTokens + outputTokens;
    const estimatedCostUsd =
      payload.estimatedCostUsd ??
      this.estimateCostUsd(provider, model, inputTokens, outputTokens);

    const item = await this.prisma.usageEvent.create({
      data: {
        projectId,
        workItemId: payload.workItemId?.trim(),
        agentRunId: payload.agentRunId?.trim(),
        runtimeId: payload.runtimeId?.trim(),
        userId: payload.userId?.trim(),
        agentType: payload.agentType.trim(),
        provider,
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd,
        occurredAt: payload.occurredAt ? new Date(payload.occurredAt) : new Date(),
      },
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'usage',
      projectId,
      workItemId: item.workItemId ?? undefined,
      agentRunId: item.agentRunId ?? undefined,
      runtimeId: item.runtimeId ?? undefined,
      userId: item.userId ?? undefined,
      agentType: item.agentType,
      eventType: 'usage.recorded',
      message: `Usage recorded for ${item.provider}:${item.model}.`,
      payload: {
        provider: item.provider,
        model: item.model,
        inputTokens: item.inputTokens,
        outputTokens: item.outputTokens,
        totalTokens: item.totalTokens,
        estimatedCostUsd: Number(item.estimatedCostUsd.toString()),
      },
      occurredAt: item.occurredAt,
    });

    return mapUsageEvent(item);
  }

  public async getProjectUsageSummary(
    projectId: string,
    from?: string,
    to?: string,
  ): Promise<UsageSummaryResponse> {
    await this.projectsService.ensureProjectExists(projectId);
    const range = this.parseRange(from, to);
    const items = await this.prisma.usageEvent.findMany({
      where: {
        projectId,
        occurredAt: range,
      },
      orderBy: { occurredAt: 'desc' },
    });

    return this.summarize(items, { projectId, from: range.gte ?? null, to: range.lte ?? null });
  }

  public async getUserUsageSummary(
    userId: string,
    from?: string,
    to?: string,
  ): Promise<UsageSummaryResponse> {
    const normalizedUserId = userId.trim();
    const range = this.parseRange(from, to);
    const items = await this.prisma.usageEvent.findMany({
      where: {
        userId: normalizedUserId,
        occurredAt: range,
      },
      orderBy: { occurredAt: 'desc' },
    });

    return this.summarize(items, {
      userId: normalizedUserId,
      from: range.gte ?? null,
      to: range.lte ?? null,
    });
  }

  private summarize(
    items: Array<{
      agentType: string;
      provider: string;
      model: string;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedCostUsd: { toString(): string } | number;
    }>,
    scope: { projectId?: string; userId?: string; from: Date | null; to: Date | null },
  ): UsageSummaryResponse {
    const byAgent = new Map<string, {
      totalEvents: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
    }>();
    const byProviderModel = new Map<string, {
      totalEvents: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
    }>();

    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let estimatedCostUsd = 0;

    for (const item of items) {
      const cost = typeof item.estimatedCostUsd === 'number'
        ? item.estimatedCostUsd
        : Number(item.estimatedCostUsd.toString());
      inputTokens += item.inputTokens;
      outputTokens += item.outputTokens;
      totalTokens += item.totalTokens;
      estimatedCostUsd += cost;

      const agentBucket = byAgent.get(item.agentType) ?? {
        totalEvents: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
      };
      agentBucket.totalEvents += 1;
      agentBucket.inputTokens += item.inputTokens;
      agentBucket.outputTokens += item.outputTokens;
      agentBucket.totalTokens += item.totalTokens;
      agentBucket.estimatedCostUsd += cost;
      byAgent.set(item.agentType, agentBucket);

      const providerModelKey = `${item.provider}:${item.model}`;
      const providerModelBucket = byProviderModel.get(providerModelKey) ?? {
        totalEvents: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
      };
      providerModelBucket.totalEvents += 1;
      providerModelBucket.inputTokens += item.inputTokens;
      providerModelBucket.outputTokens += item.outputTokens;
      providerModelBucket.totalTokens += item.totalTokens;
      providerModelBucket.estimatedCostUsd += cost;
      byProviderModel.set(providerModelKey, providerModelBucket);
    }

    return mapUsageSummary({
      projectId: scope.projectId,
      userId: scope.userId,
      from: scope.from,
      to: scope.to,
      totalEvents: items.length,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
      byAgent,
      byProviderModel,
    });
  }

  private normalizeProvider(value: string): string {
    const normalized = value.trim().toLowerCase();
    return providerAliases[normalized] ?? normalized;
  }

  private normalizeModel(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '-');
  }

  private estimateCostUsd(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const pricing = modelPricingPer1kTokens[`${provider}:${model}`];

    if (!pricing) {
      return 0;
    }

    const cost = (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
    return Number(cost.toFixed(6));
  }

  private parseRange(from?: string, to?: string) {
    const gte = from ? new Date(from) : undefined;
    const lte = to ? new Date(to) : undefined;

    if ((gte && Number.isNaN(gte.getTime())) || (lte && Number.isNaN(lte.getTime()))) {
      throw new ConflictException('Invalid usage range filter.');
    }

    return {
      ...(gte ? { gte } : {}),
      ...(lte ? { lte } : {}),
    };
  }

  private async assertWorkItemIfProvided(
    projectId: string,
    workItemId?: string,
  ): Promise<void> {
    if (!workItemId) {
      return;
    }

    const item = await this.prisma.workItem.findFirst({
      where: { id: workItemId.trim(), projectId },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Work item not found for project.');
    }
  }

  private async assertAgentRunIfProvided(
    projectId: string,
    workItemId: string | undefined,
    agentRunId?: string,
  ): Promise<void> {
    if (!agentRunId) {
      return;
    }

    const run = await this.prisma.agentRun.findFirst({
      where: {
        id: agentRunId.trim(),
        projectId,
        ...(workItemId ? { workItemId: workItemId.trim() } : {}),
      },
      select: { id: true },
    });

    if (!run) {
      throw new ConflictException('Agent run does not match the provided project scope.');
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
}
