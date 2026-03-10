import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db/client';
import {
  defaultAgentRoutingConfig,
  defaultProjectQueueLimits,
} from '@repo/shared';
import type {
  AgentRoutingConfig,
  ProjectQueueLimits,
  SystemAgentRoutingResponse,
  SystemQueueLimitsResponse,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';

const systemQueueLimitsId = 'system-defaults';
const systemAgentRoutingId = 'system-agent-routing-defaults';

const mapQueueLimits = (queueLimits: ProjectQueueLimits) => ({
  maxPlanning: queueLimits.maxPlanning,
  maxReadyForDev: queueLimits.maxReadyForDev,
  maxInDev: queueLimits.maxInDev,
  maxReadyForReview: queueLimits.maxReadyForReview,
  maxInReview: queueLimits.maxInReview,
  maxReadyForRelease: queueLimits.maxReadyForRelease,
  maxReviewRetries: queueLimits.maxReviewRetries,
  maxMergeConflictRetries: queueLimits.maxMergeConflictRetries,
  maxRuntimeRetries: queueLimits.maxRuntimeRetries,
  maxAmbiguityRetries: queueLimits.maxAmbiguityRetries,
});

const mapAgentRoutingConfig = (
  routing: Pick<
    AgentRoutingConfig,
    'defaultProvider' | 'defaultModel' | 'agentRoutes'
  >,
): AgentRoutingConfig => ({
  defaultProvider: routing.defaultProvider,
  defaultModel: routing.defaultModel,
  agentRoutes: { ...(routing.agentRoutes ?? {}) },
});

const toAgentRoutesJson = (
  agentRoutes: AgentRoutingConfig['agentRoutes'],
): Prisma.InputJsonValue => {
  return agentRoutes as unknown as Prisma.InputJsonValue;
};

@Injectable()
export class SettingsService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  public async getResolvedSystemQueueLimits(): Promise<ProjectQueueLimits> {
    const settings = await this.prisma.systemQueueLimits.findUnique({
      where: { id: systemQueueLimitsId },
    });

    if (!settings) {
      return { ...defaultProjectQueueLimits };
    }

    return mapQueueLimits(settings);
  }

  public async getSystemQueueLimits(): Promise<SystemQueueLimitsResponse> {
    const settings = await this.prisma.systemQueueLimits.findUnique({
      where: { id: systemQueueLimitsId },
    });

    if (!settings) {
      return {
        queueLimits: { ...defaultProjectQueueLimits },
        updatedAt: null,
      };
    }

    return {
      queueLimits: mapQueueLimits(settings),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  public async updateSystemQueueLimits(
    payload: ProjectQueueLimits,
  ): Promise<SystemQueueLimitsResponse> {
    const settings = await this.prisma.systemQueueLimits.upsert({
      where: { id: systemQueueLimitsId },
      create: {
        id: systemQueueLimitsId,
        ...payload,
      },
      update: {
        ...payload,
      },
    });

    return {
      queueLimits: mapQueueLimits(settings),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  public async getResolvedSystemAgentRouting(): Promise<AgentRoutingConfig> {
    const settings = await this.prisma.systemAgentRouting.findUnique({
      where: { id: systemAgentRoutingId },
    });

    if (!settings) {
      return mapAgentRoutingConfig(defaultAgentRoutingConfig);
    }

    return {
      defaultProvider: settings.defaultProvider as AgentRoutingConfig['defaultProvider'],
      defaultModel: settings.defaultModel,
      agentRoutes: (settings.agentRoutesJson as AgentRoutingConfig['agentRoutes'] | null) ?? {},
    };
  }

  public async getSystemAgentRouting(): Promise<SystemAgentRoutingResponse> {
    const settings = await this.prisma.systemAgentRouting.findUnique({
      where: { id: systemAgentRoutingId },
    });

    if (!settings) {
      return {
        routing: mapAgentRoutingConfig(defaultAgentRoutingConfig),
        updatedAt: null,
      };
    }

    return {
      routing: {
        defaultProvider: settings.defaultProvider as AgentRoutingConfig['defaultProvider'],
        defaultModel: settings.defaultModel,
        agentRoutes:
          (settings.agentRoutesJson as AgentRoutingConfig['agentRoutes'] | null) ?? {},
      },
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  public async updateSystemAgentRouting(
    payload: AgentRoutingConfig,
  ): Promise<SystemAgentRoutingResponse> {
    const settings = await this.prisma.systemAgentRouting.upsert({
      where: { id: systemAgentRoutingId },
      create: {
        id: systemAgentRoutingId,
        defaultProvider: payload.defaultProvider,
        defaultModel: payload.defaultModel,
        agentRoutesJson: toAgentRoutesJson(payload.agentRoutes),
      },
      update: {
        defaultProvider: payload.defaultProvider,
        defaultModel: payload.defaultModel,
        agentRoutesJson: toAgentRoutesJson(payload.agentRoutes),
      },
    });

    return {
      routing: {
        defaultProvider: settings.defaultProvider as AgentRoutingConfig['defaultProvider'],
        defaultModel: settings.defaultModel,
        agentRoutes:
          (settings.agentRoutesJson as AgentRoutingConfig['agentRoutes'] | null) ?? {},
      },
      updatedAt: settings.updatedAt.toISOString(),
    };
  }
}
