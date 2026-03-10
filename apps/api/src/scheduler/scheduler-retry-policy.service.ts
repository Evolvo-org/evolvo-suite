import { Inject, Injectable } from '@nestjs/common';
import type {
  Prisma,
  WorkItemRetryCategory as PrismaWorkItemRetryCategory,
} from '@repo/db/client';
import type { SchedulerLeaseLane, WorkItemState } from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

const retryCategoryMap = {
  ambiguity: 'AMBIGUITY',
  mergeConflict: 'MERGE_CONFLICT',
  review: 'REVIEW',
  runtime: 'RUNTIME',
} as const satisfies Record<string, PrismaWorkItemRetryCategory>;

const retryBaseDelayMs = {
  ambiguity: 15 * 60 * 1000,
  mergeConflict: 10 * 60 * 1000,
  review: 5 * 60 * 1000,
  runtime: 2 * 60 * 1000,
} as const;

const retryDelayCapMs = 24 * 60 * 60 * 1000;

export type SchedulerRetryCategory = keyof typeof retryCategoryMap;

export interface SchedulerRetryDecision {
  category: SchedulerRetryCategory;
  attemptCount: number;
  backoffMs: number;
  nextRetryAt: Date;
  nextState: WorkItemState;
  shouldEscalate: boolean;
  threshold: number;
}

@Injectable()
export class SchedulerRetryPolicyService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(SettingsService)
    private readonly settingsService: SettingsService,
  ) {}

  public async evaluateFailure(
    projectId: string,
    workItemId: string,
    lane: SchedulerLeaseLane,
    errorMessage?: string | null,
    summary?: string | null,
  ): Promise<SchedulerRetryDecision> {
    const category = this.classifyFailure(lane, errorMessage, summary);
    const [systemQueueLimits, projectRetryState, project] = await Promise.all([
      this.settingsService.getResolvedSystemQueueLimits(),
      this.prisma.workItemRetryState.findUnique({
        where: { workItemId },
      }),
      this.prisma.project.findUniqueOrThrow({
        where: { id: projectId },
        select: {
          queueLimits: {
            select: {
              maxReviewRetries: true,
              maxMergeConflictRetries: true,
              maxRuntimeRetries: true,
              maxAmbiguityRetries: true,
            },
          },
        },
      }),
    ]);

    const threshold = this.getThreshold(category, {
      maxReviewRetries:
        project.queueLimits?.maxReviewRetries ?? systemQueueLimits.maxReviewRetries,
      maxMergeConflictRetries:
        project.queueLimits?.maxMergeConflictRetries ??
        systemQueueLimits.maxMergeConflictRetries,
      maxRuntimeRetries:
        project.queueLimits?.maxRuntimeRetries ?? systemQueueLimits.maxRuntimeRetries,
      maxAmbiguityRetries:
        project.queueLimits?.maxAmbiguityRetries ??
        systemQueueLimits.maxAmbiguityRetries,
    });
    const attemptCount = this.getAttemptCount(projectRetryState, category) + 1;
    const backoffMs = this.calculateBackoffMs(category, attemptCount);

    return {
      category,
      attemptCount,
      backoffMs,
      nextRetryAt: new Date(Date.now() + backoffMs),
      nextState: this.getRetryTargetState(category, lane),
      shouldEscalate: attemptCount > threshold,
      threshold,
    };
  }

  public async recordFailure(
    transaction: Prisma.TransactionClient,
    projectId: string,
    workItemId: string,
    decision: SchedulerRetryDecision,
    errorMessage?: string | null,
  ) {
    const counterUpdates = this.getCounterUpdate(decision.category, decision.attemptCount);

    return transaction.workItemRetryState.upsert({
      where: { workItemId },
      create: {
        projectId,
        workItemId,
        ...counterUpdates,
        lastFailureCategory: retryCategoryMap[decision.category],
        lastFailureMessage: errorMessage?.trim() ?? null,
        lastFailureAt: new Date(),
        nextRetryAt: decision.shouldEscalate ? null : decision.nextRetryAt,
      },
      update: {
        ...counterUpdates,
        lastFailureCategory: retryCategoryMap[decision.category],
        lastFailureMessage: errorMessage?.trim() ?? null,
        lastFailureAt: new Date(),
        nextRetryAt: decision.shouldEscalate ? null : decision.nextRetryAt,
      },
    });
  }

  public async clearFailureState(
    transaction: Prisma.TransactionClient,
    workItemId: string,
  ): Promise<void> {
    await transaction.workItemRetryState.deleteMany({
      where: { workItemId },
    });
  }

  public calculateBackoffMs(
    category: SchedulerRetryCategory,
    attemptCount: number,
  ): number {
    const baseDelayMs = retryBaseDelayMs[category];
    return Math.min(retryDelayCapMs, baseDelayMs * 2 ** Math.max(attemptCount - 1, 0));
  }

  public classifyFailure(
    lane: SchedulerLeaseLane,
    errorMessage?: string | null,
    summary?: string | null,
  ): SchedulerRetryCategory {
    const combined = `${errorMessage ?? ''} ${summary ?? ''}`.toLowerCase();

    if (combined.includes('ambigu') || combined.includes('unclear') || combined.includes('clarif')) {
      return 'ambiguity';
    }

    if (lane === 'review') {
      return 'review';
    }

    if (lane === 'release' && (combined.includes('merge conflict') || combined.includes('conflict'))) {
      return 'mergeConflict';
    }

    return 'runtime';
  }

  private getAttemptCount(
    retryState:
      | {
          reviewFailureCount: number;
          mergeConflictFailureCount: number;
          runtimeFailureCount: number;
          ambiguityFailureCount: number;
        }
      | null,
    category: SchedulerRetryCategory,
  ): number {
    if (!retryState) {
      return 0;
    }

    switch (category) {
      case 'review':
        return retryState.reviewFailureCount;
      case 'mergeConflict':
        return retryState.mergeConflictFailureCount;
      case 'ambiguity':
        return retryState.ambiguityFailureCount;
      default:
        return retryState.runtimeFailureCount;
    }
  }

  private getThreshold(
    category: SchedulerRetryCategory,
    thresholds: {
      maxReviewRetries: number;
      maxMergeConflictRetries: number;
      maxRuntimeRetries: number;
      maxAmbiguityRetries: number;
    },
  ): number {
    switch (category) {
      case 'review':
        return thresholds.maxReviewRetries;
      case 'mergeConflict':
        return thresholds.maxMergeConflictRetries;
      case 'ambiguity':
        return thresholds.maxAmbiguityRetries;
      default:
        return thresholds.maxRuntimeRetries;
    }
  }

  private getRetryTargetState(
    category: SchedulerRetryCategory,
    lane: SchedulerLeaseLane,
  ): WorkItemState {
    if (lane === 'release') {
      return 'readyForRelease';
    }

    return 'readyForDev';
  }

  private getCounterUpdate(
    category: SchedulerRetryCategory,
    attemptCount: number,
  ) {
    return {
      reviewFailureCount: category === 'review' ? attemptCount : 0,
      mergeConflictFailureCount: category === 'mergeConflict' ? attemptCount : 0,
      runtimeFailureCount: category === 'runtime' ? attemptCount : 0,
      ambiguityFailureCount: category === 'ambiguity' ? attemptCount : 0,
    };
  }
}