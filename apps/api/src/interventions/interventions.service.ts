import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateHumanInterventionRequest,
  HumanInterventionCaseRecord,
  HumanInterventionListResponse,
  InterventionRetryState,
  ResolveHumanInterventionRequest,
  RetryHumanInterventionRequest,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { WorkflowStateMachineService } from '../workflow/workflow-state-machine.service.js';

import { mapInterventionCase, mapInterventionList } from './interventions.mapper.js';

type AutomatedInterventionCategory =
  | 'review'
  | 'mergeConflict'
  | 'runtime'
  | 'ambiguity'
  | 'missingConfig';

interface RetryThresholdRuleInput {
  category: Exclude<AutomatedInterventionCategory, 'missingConfig'>;
  attemptCount: number;
  threshold: number;
  shouldEscalate: boolean;
}

const toPrismaRetryState = (value: InterventionRetryState) => {
  switch (value) {
    case 'readyForDev':
      return 'READY_FOR_DEV' as const;
    default:
      return 'PLANNING' as const;
  }
};

@Injectable()
export class InterventionsService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(WorkflowStateMachineService)
    private readonly workflowStateMachineService: WorkflowStateMachineService,
  ) {}

  public async create(
    projectId: string,
    workItemId: string,
    payload: CreateHumanInterventionRequest,
  ): Promise<HumanInterventionCaseRecord> {
    await this.projectsService.ensureProjectExists(projectId);

    const existing = await this.prisma.humanInterventionCase.findFirst({
      where: {
        projectId,
        workItemId,
        status: 'OPEN',
      },
      include: this.interventionInclude,
    });

    if (existing) {
      return mapInterventionCase(existing);
    }

    const workItem = await this.getWorkItem(projectId, workItemId);
    const now = new Date();

    const created = await this.prisma.$transaction(async (transaction) => {
      if (workItem.state !== 'REQUIRES_HUMAN_INTERVENTION') {
        this.workflowStateMachineService.assertTransition(
          this.mapWorkItemState(workItem.state),
          {
            toState: 'requiresHumanIntervention',
            reason: payload.reason,
          },
        );

        await transaction.workItem.update({
          where: { id: workItemId },
          data: {
            state: 'REQUIRES_HUMAN_INTERVENTION',
            stateUpdatedAt: now,
          },
        });

        await transaction.workItemStateTransition.create({
          data: {
            projectId,
            workItemId,
            fromState: workItem.state,
            toState: 'REQUIRES_HUMAN_INTERVENTION',
            reason: payload.reason.trim(),
            isOperatorOverride: false,
          },
        });
      }

      await transaction.workItemComment.create({
        data: {
          projectId,
          workItemId,
          actorType: 'SYSTEM',
          actorName: 'Intervention system',
          content: `Human intervention requested: ${payload.summary.trim()}. ${payload.reason.trim()}`,
        },
      });

      return transaction.humanInterventionCase.create({
        data: {
          projectId,
          workItemId,
          summary: payload.summary.trim(),
          reason: payload.reason.trim(),
          attemptsMade: payload.attemptsMade?.trim(),
          evidence: payload.evidence?.trim(),
          suggestedAction: payload.suggestedAction?.trim(),
        },
        include: this.interventionInclude,
      });
    });

    return mapInterventionCase(created);
  }

  public async createAutomatedCase(
    projectId: string,
    workItemId: string,
    payload: {
      category: AutomatedInterventionCategory;
      attemptCount?: number;
      threshold?: number;
      errorMessage?: string | null;
      summary?: string | null;
      suggestedAction?: string;
    },
  ): Promise<HumanInterventionCaseRecord> {
    const summary = this.getAutomatedSummary(payload.category);
    const baseReason =
      payload.errorMessage?.trim() || payload.summary?.trim() || summary;
    const thresholdReason =
      payload.attemptCount !== undefined && payload.threshold !== undefined
        ? ` Retry threshold exceeded (${payload.attemptCount}/${payload.threshold}).`
        : '';

    return this.create(projectId, workItemId, {
      summary,
      reason: `${baseReason}${thresholdReason}`.trim(),
      attemptsMade:
        payload.attemptCount !== undefined && payload.threshold !== undefined
          ? `${payload.category} failures: ${payload.attemptCount}/${payload.threshold}.`
          : undefined,
      evidence: payload.errorMessage?.trim() ?? payload.summary?.trim() ?? undefined,
      suggestedAction:
        payload.suggestedAction ?? this.getSuggestedAction(payload.category),
    });
  }

  public getMissingConfigInterventionPayload(
    errorMessage?: string | null,
    summary?: string | null,
  ) {
    if (!this.isMissingConfigFailure(errorMessage, summary)) {
      return null;
    }

    return {
      category: 'missingConfig' as const,
      errorMessage,
      summary,
    };
  }

  public getRetryThresholdInterventionPayload(
    retryDecision: RetryThresholdRuleInput | null | undefined,
    errorMessage?: string | null,
    summary?: string | null,
  ) {
    if (!retryDecision || retryDecision.shouldEscalate !== true) {
      return null;
    }

    return {
      category: retryDecision.category,
      attemptCount: retryDecision.attemptCount,
      threshold: retryDecision.threshold,
      errorMessage,
      summary,
    };
  }

  public isMissingConfigFailure(
    errorMessage?: string | null,
    summary?: string | null,
  ): boolean {
    const combined = `${errorMessage ?? ''} ${summary ?? ''}`.toLowerCase();

    return [
      'missing secret',
      'missing config',
      'missing token',
      'missing api key',
      'missing env',
      'missing credential',
      'not configured',
      'configuration missing',
    ].some((phrase) => combined.includes(phrase));
  }

  public async list(projectId: string): Promise<HumanInterventionListResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const items = await this.prisma.humanInterventionCase.findMany({
      where: { projectId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: this.interventionInclude,
    });

    return mapInterventionList(projectId, items);
  }

  public async resolve(
    projectId: string,
    interventionId: string,
    payload: ResolveHumanInterventionRequest,
  ): Promise<HumanInterventionCaseRecord> {
    const intervention = await this.getIntervention(projectId, interventionId);

    if (intervention.status === 'RESOLVED') {
      throw new ConflictException('Human intervention case is already resolved.');
    }

    const updated = await this.prisma.humanInterventionCase.update({
      where: { id: interventionId },
      data: {
        status: 'RESOLVED',
        resolutionNotes: payload.resolutionNotes?.trim(),
        resolvedAt: new Date(),
      },
      include: this.interventionInclude,
    });

    return mapInterventionCase(updated);
  }

  public async retry(
    projectId: string,
    interventionId: string,
    payload: RetryHumanInterventionRequest,
  ): Promise<HumanInterventionCaseRecord> {
    const intervention = await this.getIntervention(projectId, interventionId);

    if (intervention.status === 'RESOLVED') {
      throw new ConflictException('Resolved intervention cases cannot be retried again.');
    }

    const reason =
      payload.resolutionNotes?.trim() ??
      intervention.suggestedAction ??
      'Operator approved retry from human intervention queue.';
    const now = new Date();

    this.workflowStateMachineService.assertTransition('requiresHumanIntervention', {
      toState: payload.toState,
      operatorOverride: true,
      reason,
    });

    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.workItem.update({
        where: { id: intervention.workItemId },
        data: {
          state: toPrismaRetryState(payload.toState),
          stateUpdatedAt: now,
        },
      });

      await transaction.workItemStateTransition.create({
        data: {
          projectId,
          workItemId: intervention.workItemId,
          fromState: 'REQUIRES_HUMAN_INTERVENTION',
          toState: toPrismaRetryState(payload.toState),
          reason,
          isOperatorOverride: true,
        },
      });

      await transaction.workItemComment.create({
        data: {
          projectId,
          workItemId: intervention.workItemId,
          actorType: 'SYSTEM',
          actorName: 'Intervention queue',
          content: `Retry approved from intervention case ${intervention.id}. Returning work item to ${payload.toState}. ${reason}`,
        },
      });

      return transaction.humanInterventionCase.update({
        where: { id: interventionId },
        data: {
          status: 'RESOLVED',
          resolutionNotes: reason,
          resolvedAt: now,
          retryCount: {
            increment: 1,
          },
        },
        include: this.interventionInclude,
      });
    });

    return mapInterventionCase(updated);
  }

  private get interventionInclude() {
    return {
      workItem: {
        select: {
          title: true,
        },
      },
    };
  }

  private async getWorkItem(projectId: string, workItemId: string) {
    const workItem = await this.prisma.workItem.findFirst({
      where: { id: workItemId, projectId },
      select: {
        id: true,
        state: true,
      },
    });

    if (!workItem) {
      throw new NotFoundException('Work item not found for project.');
    }

    return workItem;
  }

  private async getIntervention(projectId: string, interventionId: string) {
    const intervention = await this.prisma.humanInterventionCase.findFirst({
      where: { id: interventionId, projectId },
      include: this.interventionInclude,
    });

    if (!intervention) {
      throw new NotFoundException('Human intervention case not found.');
    }

    return intervention;
  }

  private mapWorkItemState(value: string) {
    switch (value) {
      case 'PLANNING':
        return 'planning' as const;
      case 'READY_FOR_DEV':
        return 'readyForDev' as const;
      case 'IN_DEV':
        return 'inDev' as const;
      case 'READY_FOR_REVIEW':
        return 'readyForReview' as const;
      case 'IN_REVIEW':
        return 'inReview' as const;
      case 'READY_FOR_RELEASE':
        return 'readyForRelease' as const;
      case 'REQUIRES_HUMAN_INTERVENTION':
        return 'requiresHumanIntervention' as const;
      case 'RELEASED':
        return 'released' as const;
      default:
        return 'inbox' as const;
    }
  }

  private getAutomatedSummary(category: AutomatedInterventionCategory): string {
    switch (category) {
      case 'review':
        return 'Repeated review failures blocked automation.';
      case 'mergeConflict':
        return 'Repeated merge conflicts blocked release automation.';
      case 'ambiguity':
        return 'Ambiguous requirements blocked automation.';
      case 'missingConfig':
        return 'Missing configuration blocked automation.';
      default:
        return 'Repeated runtime failures blocked automation.';
    }
  }

  private getSuggestedAction(category: AutomatedInterventionCategory): string {
    switch (category) {
      case 'review':
        return 'Address the blocking review feedback, re-run validation, and retry the work item.';
      case 'mergeConflict':
        return 'Resolve the branch conflicts, verify the target branch, and retry release automation.';
      case 'ambiguity':
        return 'Clarify the requirement, update the planning context, and retry automation.';
      case 'missingConfig':
        return 'Restore the missing secret or configuration, verify runtime access, and retry automation.';
      default:
        return 'Inspect runtime logs, repair the failing environment or tooling, and retry automation.';
    }
  }
}
