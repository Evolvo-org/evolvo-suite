import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Prisma,
  SchedulerLeaseLane as PrismaSchedulerLeaseLane,
  WorkItem,
  WorkItemLease,
  WorkItemState,
} from '@repo/db/client';
import type {
  AcquireSchedulerLeaseRequest,
  AcquireSchedulerLeaseResponse,
  RecoverSchedulerLeasesRequest,
  RecoverSchedulerLeasesResponse,
  RenewSchedulerLeaseRequest,
  SchedulerLease,
  SchedulerLeaseLane,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { WorkflowStateMachineService } from '../workflow/workflow-state-machine.service.js';

import { mapSchedulerLease } from './scheduler.mapper.js';

const defaultLeaseDurationSeconds = 600;
const defaultRecoveryLimit = 50;

const laneStateMap: Record<SchedulerLeaseLane, WorkItemState[]> = {
  dev: ['READY_FOR_DEV'],
  review: ['READY_FOR_REVIEW'],
  release: ['READY_FOR_RELEASE'],
};

const laneLeaseMap: Record<SchedulerLeaseLane, PrismaSchedulerLeaseLane> = {
  dev: 'DEV',
  review: 'REVIEW',
  release: 'RELEASE',
};

const priorityWeight: Record<WorkItem['priority'], number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

type CandidateWorkItem = Pick<
  WorkItem,
  'id' | 'projectId' | 'title' | 'state' | 'priority' | 'sortOrder' | 'stateUpdatedAt'
>;

type LeaseWithTitle = WorkItemLease & { workItem: { title: string; state: WorkItemState } };

@Injectable()
export class SchedulerService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(WorkflowStateMachineService)
    private readonly workflowStateMachineService: WorkflowStateMachineService,
  ) {}

  public async acquireLease(
    payload: AcquireSchedulerLeaseRequest,
  ): Promise<AcquireSchedulerLeaseResponse> {
    const recovered = await this.recoverExpiredLeases();
    const now = new Date();
    const lanes: SchedulerLeaseLane[] = payload.lanes?.length
      ? payload.lanes
      : ['dev', 'review', 'release'];
    const leaseDurationSeconds =
      payload.leaseDurationSeconds ?? defaultLeaseDurationSeconds;

    if (payload.projectId) {
      await this.projectsService.ensureProjectExists(payload.projectId);
    }

    const lease = await this.prisma.$transaction(async (transaction) => {
      const candidate = await this.selectCandidateWorkItem(
        transaction,
        lanes,
        payload.projectId,
        now,
      );

      if (!candidate) {
        return null;
      }

      const activeLease = await transaction.workItemLease.findFirst({
        where: {
          workItemId: candidate.id,
          status: 'ACTIVE',
          expiresAt: { gt: now },
        },
        select: { id: true },
      });

      if (activeLease) {
        return null;
      }

      const lane = this.getLaneForState(candidate.state);
      const createdLease = await transaction.workItemLease.create({
        data: {
          projectId: candidate.projectId,
          workItemId: candidate.id,
          runtimeId: payload.runtimeId.trim(),
          lane: laneLeaseMap[lane],
          leaseToken: randomUUID(),
          leasedAt: now,
          expiresAt: new Date(now.getTime() + leaseDurationSeconds * 1000),
        },
        include: {
          workItem: {
            select: {
              title: true,
              state: true,
            },
          },
        },
      });

      await this.moveWorkItemIntoActiveExecution(
        transaction,
        candidate,
        payload.runtimeId.trim(),
      );

      return createdLease;
    });

    return {
      lease: lease ? mapSchedulerLease(lease) : null,
      recoveredCount: recovered.recoveredCount,
    };
  }

  public async renewLease(
    leaseId: string,
    payload: RenewSchedulerLeaseRequest,
  ): Promise<SchedulerLease> {
    await this.expireStaleLeases();

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

    if (lease.runtimeId !== payload.runtimeId.trim()) {
      throw new ConflictException('Scheduler lease is owned by another runtime.');
    }

    if (lease.leaseToken !== payload.leaseToken.trim()) {
      throw new ConflictException('Scheduler lease token is invalid.');
    }

    if (lease.status !== 'ACTIVE') {
      throw new ConflictException('Only active scheduler leases can be renewed.');
    }

    if (lease.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException('Scheduler lease has already expired.');
    }

    const renewedLease = await this.prisma.workItemLease.update({
      where: { id: leaseId },
      data: {
        renewedAt: new Date(),
        expiresAt: new Date(
          Date.now() +
            (payload.leaseDurationSeconds ?? defaultLeaseDurationSeconds) * 1000,
        ),
      },
      include: {
        workItem: {
          select: {
            title: true,
            state: true,
          },
        },
      },
    });

    return mapSchedulerLease(renewedLease);
  }

  public async recoverExpiredLeases(
    payload: RecoverSchedulerLeasesRequest = {},
  ): Promise<RecoverSchedulerLeasesResponse> {
    const limit = payload.limit ?? defaultRecoveryLimit;
    await this.expireStaleLeases(limit);
    const now = new Date();

    const recoveredItems = await this.prisma.$transaction(async (transaction) => {
      const expiredLeases = await transaction.workItemLease.findMany({
        where: {
          status: 'EXPIRED',
        },
        orderBy: {
          expiresAt: 'asc',
        },
        take: limit,
        include: {
          workItem: {
            select: {
              title: true,
              state: true,
            },
          },
        },
      });

      const recovered: SchedulerLease[] = [];

      for (const lease of expiredLeases) {
        await this.recoverLeasedWorkItem(transaction, lease, now);

        const updatedLease = await transaction.workItemLease.update({
          where: { id: lease.id },
          data: {
            status: 'RECOVERED',
            recoveredAt: now,
            recoveryReason:
              lease.recoveryReason ?? 'Lease expired before renewal and was recovered by the scheduler.',
          },
          include: {
            workItem: {
              select: {
                title: true,
                state: true,
              },
            },
          },
        });

        recovered.push(mapSchedulerLease(updatedLease));
      }

      return recovered;
    });

    return {
      recoveredCount: recoveredItems.length,
      items: recoveredItems,
    };
  }

  private async expireStaleLeases(limit = defaultRecoveryLimit): Promise<number> {
    const expiredCandidates = await this.prisma.workItemLease.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        expiresAt: 'asc',
      },
      take: limit,
      select: {
        id: true,
      },
    });

    if (expiredCandidates.length === 0) {
      return 0;
    }

    const result = await this.prisma.workItemLease.updateMany({
      where: {
        id: {
          in: expiredCandidates.map((lease) => lease.id),
        },
      },
      data: {
        status: 'EXPIRED',
        recoveryReason:
          'Lease expired before the runtime renewed it. Recovery is required before the work item can be leased again.',
      },
    });

    return result.count;
  }

  private async selectCandidateWorkItem(
    transaction: Prisma.TransactionClient,
    lanes: SchedulerLeaseLane[],
    projectId: string | undefined,
    now: Date,
  ): Promise<CandidateWorkItem | null> {
    const eligibleStates = lanes.flatMap(
      (lane) => laneStateMap[lane],
    ) as WorkItemState[];
    const candidates = await transaction.workItem.findMany({
      where: {
        projectId,
        state: {
          in: eligibleStates,
        },
        project: {
          lifecycleStatus: 'ACTIVE',
        },
        leases: {
          none: {
            status: 'ACTIVE',
            expiresAt: {
              gt: now,
            },
          },
        },
      },
      select: {
        id: true,
        projectId: true,
        title: true,
        state: true,
        priority: true,
        sortOrder: true,
        stateUpdatedAt: true,
      },
      orderBy: [{ stateUpdatedAt: 'asc' }, { sortOrder: 'asc' }],
    });

    if (candidates.length === 0) {
      return null;
    }

    const candidateProjectIds = [...new Set(candidates.map((item) => item.projectId))];
    const activeLeaseCounts = await transaction.workItemLease.groupBy({
      by: ['projectId'],
      where: {
        projectId: {
          in: candidateProjectIds,
        },
        status: 'ACTIVE',
        expiresAt: {
          gt: now,
        },
      },
      _count: {
        _all: true,
      },
    });

    const activeLeaseCountMap = new Map<string, number>(
      activeLeaseCounts.map((item) => [item.projectId, item._count._all]),
    );

    const laneOrder = new Map(lanes.map((lane, index) => [lane, index]));

    const sortedCandidates = [...candidates].sort((left, right) => {
      const leftActiveLeaseCount = activeLeaseCountMap.get(left.projectId) ?? 0;
      const rightActiveLeaseCount = activeLeaseCountMap.get(right.projectId) ?? 0;

      if (leftActiveLeaseCount !== rightActiveLeaseCount) {
        return leftActiveLeaseCount - rightActiveLeaseCount;
      }

      const leftLaneOrder = laneOrder.get(this.getLaneForState(left.state)) ?? 99;
      const rightLaneOrder = laneOrder.get(this.getLaneForState(right.state)) ?? 99;

      if (leftLaneOrder !== rightLaneOrder) {
        return leftLaneOrder - rightLaneOrder;
      }

      const priorityDifference =
        priorityWeight[right.priority] - priorityWeight[left.priority];

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      if (left.stateUpdatedAt.getTime() !== right.stateUpdatedAt.getTime()) {
        return left.stateUpdatedAt.getTime() - right.stateUpdatedAt.getTime();
      }

      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.projectId.localeCompare(right.projectId);
    });

    return sortedCandidates[0] ?? null;
  }

  private getLaneForState(state: WorkItemState): SchedulerLeaseLane {
    switch (state) {
      case 'READY_FOR_REVIEW':
        return 'review';
      case 'READY_FOR_RELEASE':
        return 'release';
      default:
        return 'dev';
    }
  }

  private async moveWorkItemIntoActiveExecution(
    transaction: Prisma.TransactionClient,
    workItem: CandidateWorkItem,
    runtimeId: string,
  ): Promise<void> {
    if (workItem.state === 'READY_FOR_RELEASE') {
      return;
    }

    const toState = workItem.state === 'READY_FOR_REVIEW' ? 'inReview' : 'inDev';
    const fromState = workItem.state === 'READY_FOR_REVIEW' ? 'readyForReview' : 'readyForDev';

    this.workflowStateMachineService.assertTransition(fromState, {
      toState,
    });

    await transaction.workItem.update({
      where: { id: workItem.id },
      data: {
        state: toState === 'inReview' ? 'IN_REVIEW' : 'IN_DEV',
        stateUpdatedAt: new Date(),
      },
    });

    await transaction.workItemStateTransition.create({
      data: {
        projectId: workItem.projectId,
        workItemId: workItem.id,
        fromState: workItem.state,
        toState: toState === 'inReview' ? 'IN_REVIEW' : 'IN_DEV',
        reason: `Scheduler lease granted to runtime ${runtimeId}.`,
        isOperatorOverride: false,
      },
    });
  }

  private async recoverLeasedWorkItem(
    transaction: Prisma.TransactionClient,
    lease: LeaseWithTitle,
    now: Date,
  ): Promise<void> {
    if (lease.lane === 'RELEASE') {
      return;
    }

    const currentState = lease.workItem.state;
    const recoveryTargetState = lease.lane === 'REVIEW' ? 'READY_FOR_REVIEW' : 'READY_FOR_DEV';
    const fromState = lease.lane === 'REVIEW' ? 'inReview' : 'inDev';
    const toState = lease.lane === 'REVIEW' ? 'readyForReview' : 'readyForDev';

    if (currentState !== (lease.lane === 'REVIEW' ? 'IN_REVIEW' : 'IN_DEV')) {
      return;
    }

    this.workflowStateMachineService.assertTransition(fromState, {
      toState,
      operatorOverride: true,
      reason: 'Scheduler recovered expired lease.',
    });

    await transaction.workItem.update({
      where: { id: lease.workItemId },
      data: {
        state: recoveryTargetState,
        stateUpdatedAt: now,
      },
    });

    await transaction.workItemStateTransition.create({
      data: {
        projectId: lease.projectId,
        workItemId: lease.workItemId,
        fromState: currentState,
        toState: recoveryTargetState,
        reason: 'Scheduler recovered an expired lease and returned the work item to the ready queue.',
        isOperatorOverride: true,
      },
    });
  }
}
