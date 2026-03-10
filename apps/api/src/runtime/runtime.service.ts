import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  RegisterRuntimeRequest,
  RequestRuntimeWorkRequest,
  RuntimeArtifactUploadMetadataRequest,
  RuntimeArtifactUploadMetadataResponse,
  RuntimeDetailResponse,
  RuntimeHeartbeatRequest,
  RuntimeJobResultRequest,
  RuntimeJobResultResponse,
  RuntimeWorkDispatchResponse,
  RuntimeProgressUpdateRequest,
  SchedulerLease,
  WorkItemState,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { InterventionsService } from '../interventions/interventions.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { SchedulerService } from '../scheduler/scheduler.service.js';
import { LogsService } from '../logs/logs.service.js';
import { SchedulerRetryPolicyService } from '../scheduler/scheduler-retry-policy.service.js';
import { mapSchedulerLease } from '../scheduler/scheduler.mapper.js';
import { WorkflowStateMachineService } from '../workflow/workflow-state-machine.service.js';

import {
  mapRuntimeArtifactUploadMetadata,
  mapRuntimeDetail,
  mapRuntimeDispatchProject,
  mapRuntimeDispatchWorkItem,
} from './runtime.mapper.js';

const toPrismaStatus = (value: RuntimeHeartbeatRequest['status']) => {
  switch (value) {
    case 'busy':
      return 'BUSY' as const;
    case 'degraded':
      return 'DEGRADED' as const;
    default:
      return 'IDLE' as const;
  }
};

const toPrismaWorkItemState = (value: WorkItemState) => {
  switch (value) {
    case 'planning':
      return 'PLANNING' as const;
    case 'readyForDev':
      return 'READY_FOR_DEV' as const;
    case 'inDev':
      return 'IN_DEV' as const;
    case 'readyForReview':
      return 'READY_FOR_REVIEW' as const;
    case 'inReview':
      return 'IN_REVIEW' as const;
    case 'readyForRelease':
      return 'READY_FOR_RELEASE' as const;
    case 'requiresHumanIntervention':
      return 'REQUIRES_HUMAN_INTERVENTION' as const;
    case 'released':
      return 'RELEASED' as const;
    default:
      return 'INBOX' as const;
  }
};

const fromPrismaWorkItemState = (value: string): WorkItemState => {
  switch (value) {
    case 'PLANNING':
      return 'planning';
    case 'READY_FOR_DEV':
      return 'readyForDev';
    case 'IN_DEV':
      return 'inDev';
    case 'READY_FOR_REVIEW':
      return 'readyForReview';
    case 'IN_REVIEW':
      return 'inReview';
    case 'READY_FOR_RELEASE':
      return 'readyForRelease';
    case 'REQUIRES_HUMAN_INTERVENTION':
      return 'requiresHumanIntervention';
    case 'RELEASED':
      return 'released';
    default:
      return 'inbox';
  }
};

const toPrismaArtifactType = (
  value: RuntimeArtifactUploadMetadataRequest['artifactType'],
) => {
  switch (value) {
    case 'log':
      return 'LOG' as const;
    case 'patch':
      return 'PATCH' as const;
    case 'testReport':
      return 'TEST_REPORT' as const;
    case 'buildOutput':
      return 'BUILD_OUTPUT' as const;
    case 'releaseNote':
      return 'RELEASE_NOTE' as const;
    default:
      return 'OTHER' as const;
  }
};

const normalizeLeaseLane = (
  value: SchedulerLease['lane'] | 'DEV' | 'REVIEW' | 'RELEASE',
): SchedulerLease['lane'] => {
  switch (value) {
    case 'REVIEW':
      return 'review';
    case 'RELEASE':
      return 'release';
    case 'DEV':
      return 'dev';
    default:
      return value;
  }
};

@Injectable()
export class RuntimeService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(InterventionsService)
    private readonly interventionsService: InterventionsService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(SchedulerService)
    private readonly schedulerService: SchedulerService,
    @Inject(SchedulerRetryPolicyService)
    private readonly schedulerRetryPolicyService: SchedulerRetryPolicyService,
    @Inject(LogsService)
    private readonly logsService: LogsService,
    @Inject(WorkflowStateMachineService)
    private readonly workflowStateMachineService: WorkflowStateMachineService,
  ) {}

  public async registerRuntime(
    payload: RegisterRuntimeRequest,
  ): Promise<RuntimeDetailResponse> {
    const runtime = await this.prisma.runtimeInstance.upsert({
      where: { id: payload.runtimeId.trim() },
      create: {
        id: payload.runtimeId.trim(),
        displayName: payload.displayName.trim(),
        capabilities: payload.capabilities?.map((value) => value.trim()) ?? [],
        lastSeenAt: new Date(),
      },
      update: {
        displayName: payload.displayName.trim(),
        capabilities: payload.capabilities?.map((value) => value.trim()) ?? [],
        status: 'IDLE',
        lastSeenAt: new Date(),
      },
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'runtime',
      runtimeId: runtime.id,
      eventType: 'runtime.registered',
      message: `Runtime ${runtime.id} registered.`,
      payload: {
        runtimeId: runtime.id,
        displayName: runtime.displayName,
        capabilities: runtime.capabilities,
      },
    });

    return mapRuntimeDetail(runtime);
  }

  public async recordHeartbeat(
    runtimeId: string,
    payload: RuntimeHeartbeatRequest,
  ): Promise<RuntimeDetailResponse> {
    await this.assertRuntimeExists(runtimeId);

    const runtime = await this.prisma.runtimeInstance.update({
      where: { id: runtimeId },
      data: {
        status: toPrismaStatus(payload.status),
        activeJobSummary: payload.activeJobSummary?.trim() ?? null,
        lastAction: payload.lastAction?.trim() ?? null,
        lastError: payload.lastError?.trim() ?? null,
        lastSeenAt: new Date(),
      },
    });

    await this.logsService.writeLog({
      level: payload.status === 'degraded' ? 'warn' : 'info',
      source: 'runtime',
      runtimeId: runtime.id,
      eventType: 'runtime.heartbeat.recorded',
      message: `Heartbeat recorded for runtime ${runtime.id}.`,
      payload: {
        runtimeId: runtime.id,
        status: payload.status,
        activeJobSummary: payload.activeJobSummary?.trim() ?? null,
        lastAction: payload.lastAction?.trim() ?? null,
        lastError: payload.lastError?.trim() ?? null,
      },
    });

    return mapRuntimeDetail(runtime);
  }

  public async requestWork(
    runtimeId: string,
    payload: RequestRuntimeWorkRequest,
  ): Promise<RuntimeWorkDispatchResponse> {
    await this.assertRuntimeExists(runtimeId);

    const acquired = await this.schedulerService.acquireLease({
      runtimeId,
      ...payload,
    });

    if (!acquired.lease) {
      await this.prisma.runtimeInstance.update({
        where: { id: runtimeId },
        data: {
          status: 'IDLE',
          activeJobSummary: null,
          lastAction: 'No eligible leased work was available.',
          lastSeenAt: new Date(),
        },
      });

      await this.logsService.writeLog({
        level: 'info',
        source: 'runtime',
        runtimeId,
        eventType: 'runtime.work.unavailable',
        message: `No eligible work was available for runtime ${runtimeId}.`,
        payload: {
          runtimeId,
          recoveredCount: acquired.recoveredCount,
          requestedLanes: payload.lanes ?? null,
          projectId: payload.projectId ?? null,
        },
      });

      return {
        lease: null,
        recoveredCount: acquired.recoveredCount,
        project: null,
        workItem: null,
      };
    }

    const [project, workItem] = await Promise.all([
      this.projectsService.getProjectDetail(acquired.lease.projectId),
      this.prisma.workItem.findUniqueOrThrow({
        where: { id: acquired.lease.workItemId },
        include: {
          epic: {
            select: {
              title: true,
            },
          },
        },
      }),
    ]);

    await this.prisma.runtimeInstance.update({
      where: { id: runtimeId },
      data: {
        status: 'BUSY',
        activeJobSummary: `Leased ${workItem.title}`,
        lastAction: `Lease ${acquired.lease.id} granted for ${workItem.title}.`,
        lastSeenAt: new Date(),
      },
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'runtime',
      projectId: acquired.lease.projectId,
      workItemId: acquired.lease.workItemId,
      runtimeId,
      eventType: 'runtime.work.dispatched',
      message: `Runtime ${runtimeId} leased ${workItem.title}.`,
      payload: {
        runtimeId,
        leaseId: acquired.lease.id,
        lane: acquired.lease.lane,
        workItemTitle: workItem.title,
        recoveredCount: acquired.recoveredCount,
      },
    });

    return {
      lease: acquired.lease,
      recoveredCount: acquired.recoveredCount,
      project: mapRuntimeDispatchProject({
        id: project.id,
        name: project.name,
        slug: project.slug,
        repository: project.repository,
        queueLimits: project.queueLimits,
      }),
      workItem: mapRuntimeDispatchWorkItem(workItem, acquired.lease.lane),
    };
  }

  public async recordProgress(
    runtimeId: string,
    leaseId: string,
    payload: RuntimeProgressUpdateRequest,
  ): Promise<SchedulerLease> {
    await this.assertRuntimeExists(runtimeId);
    const lease = await this.assertActiveLeaseOwnership(
      runtimeId,
      leaseId,
      payload.leaseToken,
    );

    const renewedLease = await this.schedulerService.renewLease(leaseId, {
      runtimeId,
      leaseToken: payload.leaseToken,
      leaseDurationSeconds: payload.leaseDurationSeconds,
    });

    const progressSuffix =
      payload.progressPercent !== undefined
        ? ` (${payload.progressPercent}% complete)`
        : '';

    await this.prisma.runtimeInstance.update({
      where: { id: runtimeId },
      data: {
        status: 'BUSY',
        activeJobSummary:
          payload.activeJobSummary?.trim() ??
          `Working on ${lease.workItem.title}${progressSuffix}`,
        lastAction:
          payload.lastAction?.trim() ??
          `Progress update recorded for ${lease.workItem.title}${progressSuffix}.`,
        lastSeenAt: new Date(),
      },
    });

    return renewedLease;
  }

  public async recordJobResult(
    runtimeId: string,
    leaseId: string,
    payload: RuntimeJobResultRequest,
  ): Promise<RuntimeJobResultResponse> {
    await this.assertRuntimeExists(runtimeId);
    const lease = await this.assertActiveLeaseOwnership(
      runtimeId,
      leaseId,
      payload.leaseToken,
    );
    const now = new Date();
    const lane = normalizeLeaseLane(lease.lane);
    const currentState = fromPrismaWorkItemState(lease.workItem.state);
    const missingConfigIntervention =
      this.interventionsService.getMissingConfigInterventionPayload(
        payload.errorMessage,
        payload.summary,
      );
    const retryDecision =
      payload.nextState ||
      payload.outcome === 'completed' ||
      missingConfigIntervention !== null
        ? null
        : await this.schedulerRetryPolicyService.evaluateFailure(
            lease.projectId,
            lease.workItemId,
            lane,
            payload.errorMessage,
            payload.summary,
          );
    const nextState = missingConfigIntervention
      ? 'requiresHumanIntervention'
      : this.resolveResultState(lane, payload, retryDecision);
    const reason = this.buildResultReason(
      lease.workItem.title,
      payload,
      retryDecision,
      nextState,
    );
    const shouldTransition = nextState !== currentState;
    const operatorOverride =
      retryDecision !== null &&
      retryDecision.shouldEscalate === false &&
      shouldTransition;

    if (shouldTransition) {
      this.workflowStateMachineService.assertTransition(currentState, {
        toState: nextState,
        reason,
        operatorOverride,
      });
    }

    const [updatedLease, runtime] = await this.prisma.$transaction(async (transaction) => {
      if (shouldTransition) {
        await transaction.workItem.update({
          where: { id: lease.workItemId },
          data: {
            state: toPrismaWorkItemState(nextState),
            stateUpdatedAt: now,
          },
        });

        await transaction.workItemStateTransition.create({
          data: {
            projectId: lease.projectId,
            workItemId: lease.workItemId,
            fromState: lease.workItem.state,
            toState: toPrismaWorkItemState(nextState),
            reason,
            isOperatorOverride: operatorOverride,
          },
        });
      }

      await transaction.workItemComment.create({
        data: {
          projectId: lease.projectId,
          workItemId: lease.workItemId,
          actorType: 'SYSTEM',
          actorName: runtimeId,
          content: `Runtime ${runtimeId} reported ${payload.outcome} for ${lease.workItem.title}. ${reason}`,
        },
      });

      if (payload.outcome === 'completed') {
        await this.schedulerRetryPolicyService.clearFailureState(
          transaction,
          lease.workItemId,
        );
      } else if (retryDecision) {
        await this.schedulerRetryPolicyService.recordFailure(
          transaction,
          lease.projectId,
          lease.workItemId,
          retryDecision,
          payload.errorMessage,
        );
      }

      const releasedLease = await transaction.workItemLease.update({
        where: { id: leaseId },
        data: {
          status: 'RELEASED',
          releasedAt: now,
        },
        include: {
          workItem: {
            select: {
              title: true,
            },
          },
        },
      });

      const updatedRuntime = await transaction.runtimeInstance.update({
        where: { id: runtimeId },
        data: {
          status: nextState === 'requiresHumanIntervention' ? 'DEGRADED' : 'IDLE',
          activeJobSummary: null,
          lastAction: reason,
          lastError: payload.errorMessage?.trim() ?? null,
          lastSeenAt: now,
        },
      });

      return [releasedLease, updatedRuntime] as const;
    });

    if (payload.outcome !== 'completed' && nextState === 'requiresHumanIntervention') {
      if (missingConfigIntervention) {
        await this.interventionsService.createAutomatedCase(
          lease.projectId,
          lease.workItemId,
          missingConfigIntervention,
        );
      } else {
        const retryThresholdIntervention =
          this.interventionsService.getRetryThresholdInterventionPayload(
            retryDecision,
            payload.errorMessage,
            payload.summary,
          );

        if (retryThresholdIntervention) {
          await this.interventionsService.createAutomatedCase(
            lease.projectId,
            lease.workItemId,
            retryThresholdIntervention,
          );
        }
      }
    }

    await this.logsService.writeLog({
      level: payload.outcome === 'completed' ? 'info' : 'warn',
      source: 'runtime',
      projectId: lease.projectId,
      workItemId: lease.workItemId,
      runtimeId,
      eventType:
        payload.outcome === 'completed'
          ? 'runtime.job.completed'
          : 'runtime.job.failed',
      message: `Runtime ${runtimeId} reported ${payload.outcome} for ${lease.workItem.title}.`,
      payload: {
        runtimeId,
        leaseId,
        lane,
        outcome: payload.outcome,
        nextState,
        summary: payload.summary?.trim() ?? null,
        errorMessage: payload.errorMessage?.trim() ?? null,
        retryDecision,
      },
    });

    return {
      lease: mapSchedulerLease(updatedLease),
      runtime: mapRuntimeDetail(runtime),
      workItemId: lease.workItemId,
      state: nextState,
    };
  }

  public async createArtifactUploadMetadata(
    runtimeId: string,
    leaseId: string,
    payload: RuntimeArtifactUploadMetadataRequest,
  ): Promise<RuntimeArtifactUploadMetadataResponse> {
    await this.assertRuntimeExists(runtimeId);
    const lease = await this.assertActiveLeaseOwnership(
      runtimeId,
      leaseId,
      payload.leaseToken,
    );

    const artifact = await this.prisma.runtimeArtifact.create({
      data: {
        runtimeId,
        leaseId,
        artifactType: toPrismaArtifactType(payload.artifactType),
        fileName: payload.fileName.trim(),
        contentType: payload.contentType?.trim() ?? null,
        sizeBytes: payload.sizeBytes ?? null,
        storageKey: `${lease.projectId}/${lease.workItemId}/${leaseId}/${Date.now()}-${payload.fileName.trim()}`,
      },
    });

    await this.prisma.runtimeInstance.update({
      where: { id: runtimeId },
      data: {
        lastAction: `Prepared artifact metadata for ${payload.fileName.trim()}.`,
        lastSeenAt: new Date(),
      },
    });

    return mapRuntimeArtifactUploadMetadata(artifact);
  }

  public async getRuntimeDetail(runtimeId: string): Promise<RuntimeDetailResponse> {
    const runtime = await this.prisma.runtimeInstance.findUnique({
      where: { id: runtimeId },
    });

    if (!runtime) {
      throw new NotFoundException('Runtime not found.');
    }

    return mapRuntimeDetail(runtime);
  }

  private async assertRuntimeExists(runtimeId: string): Promise<void> {
    const runtime = await this.prisma.runtimeInstance.findUnique({
      where: { id: runtimeId },
      select: { id: true },
    });

    if (!runtime) {
      throw new NotFoundException('Runtime not found.');
    }
  }

  private async assertActiveLeaseOwnership(
    runtimeId: string,
    leaseId: string,
    leaseToken: string,
  ) {
    const lease = await this.prisma.workItemLease.findUnique({
      where: { id: leaseId },
      include: {
        workItem: {
          select: {
            title: true,
            state: true,
          },
        },
      },
    });

    if (!lease) {
      throw new NotFoundException('Scheduler lease not found.');
    }

    if (lease.runtimeId !== runtimeId) {
      throw new ConflictException('Scheduler lease is owned by another runtime.');
    }

    if (lease.leaseToken !== leaseToken.trim()) {
      throw new ConflictException('Scheduler lease token is invalid.');
    }

    if (lease.status !== 'ACTIVE') {
      throw new ConflictException('Scheduler lease is not active.');
    }

    if (lease.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException('Scheduler lease has expired.');
    }

    return lease;
  }

  private resolveResultState(
    lane: SchedulerLease['lane'],
    payload: RuntimeJobResultRequest,
    retryDecision?: {
      nextState: WorkItemState;
      shouldEscalate: boolean;
    } | null,
  ): WorkItemState {
    if (payload.nextState) {
      return payload.nextState;
    }

    if (retryDecision && !retryDecision.shouldEscalate) {
      return retryDecision.nextState;
    }

    if (payload.outcome !== 'completed') {
      return 'requiresHumanIntervention';
    }

    switch (lane) {
      case 'review':
        return 'readyForRelease';
      case 'release':
        return 'released';
      default:
        return 'readyForReview';
    }
  }

  private defaultResultReason(
    title: string,
    outcome: RuntimeJobResultRequest['outcome'],
  ): string {
    if (outcome === 'completed') {
      return `Runtime completed work item ${title}.`;
    }

    if (outcome === 'cancelled') {
      return `Runtime cancelled work item ${title}.`;
    }

    return `Runtime reported a failure for work item ${title}.`;
  }

  private buildResultReason(
    title: string,
    payload: RuntimeJobResultRequest,
    retryDecision:
      | {
          attemptCount: number;
          backoffMs: number;
          category: string;
          nextState: WorkItemState;
          shouldEscalate: boolean;
          threshold: number;
        }
      | null,
    nextState: WorkItemState,
  ): string {
    const baseReason =
      payload.errorMessage?.trim() ??
      payload.summary?.trim() ??
      this.defaultResultReason(title, payload.outcome);

    if (!retryDecision) {
      return baseReason;
    }

    if (retryDecision.shouldEscalate) {
      return `${baseReason} Retry threshold exceeded for ${retryDecision.category} failures (${retryDecision.attemptCount}/${retryDecision.threshold}). Escalating to ${nextState}.`;
    }

    return `${baseReason} Scheduled retry ${retryDecision.attemptCount}/${retryDecision.threshold} for ${retryDecision.category} failures after ${Math.ceil(retryDecision.backoffMs / 60000)} minute(s). Returning to ${nextState}.`;
  }
}
