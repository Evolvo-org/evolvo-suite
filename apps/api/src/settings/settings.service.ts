import { Inject, Injectable } from '@nestjs/common';
import { defaultProjectQueueLimits } from '@repo/shared';
import type {
  ProjectQueueLimits,
  SystemQueueLimitsResponse,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';

const systemQueueLimitsId = 'system-defaults';

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
}
