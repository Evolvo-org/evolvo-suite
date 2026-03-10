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
  ProjectQueueLimits,
  ProjectLifecycleStatus,
  RecoverSchedulerLeasesRequest,
  RecoverSchedulerLeasesResponse,
  RenewSchedulerLeaseRequest,
  SchedulerLease,
  SchedulerLaneCursor,
  SchedulerLeaseLane,
  SchedulerProjectLaneState,
  SchedulerProjectSkipReason,
  SchedulerSkippedProject,
  SchedulerStateResponse,
} from '@repo/shared';
import { schedulerLeaseLanes } from '@repo/shared';

import { LogsService } from '../logs/logs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { WorkflowStateMachineService } from '../workflow/workflow-state-machine.service.js';

import { mapSchedulerLease } from './scheduler.mapper.js';

const defaultLeaseDurationSeconds = 600;
const defaultRecoveryLimit = 50;
const planningRequestEpicTitle = 'Planning requests';

const laneStateMap: Record<SchedulerLeaseLane, WorkItemState[]> = {
  planning: ['PLANNING'],
  dev: ['READY_FOR_DEV'],
  review: ['READY_FOR_REVIEW'],
  release: ['READY_FOR_RELEASE'],
};

const laneLeaseMap: Record<SchedulerLeaseLane, PrismaSchedulerLeaseLane> = {
  planning: 'PLANNING',
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
> & {
  epic: {
    title: string;
  } | null;
};

type LeaseWithTitle = WorkItemLease & { workItem: { title: string; state: WorkItemState } };

type EffectiveProjectQueueLimits = Pick<
  ProjectQueueLimits,
  'maxPlanning' | 'maxInDev' | 'maxInReview' | 'maxReadyForRelease'
>;

type ProjectQueueLimitsRecord = {
  maxPlanning: number;
  maxInDev: number;
  maxInReview: number;
  maxReadyForRelease: number;
};

type PlanningContextProjectRecord = {
  productSpec: { id: string } | null;
  developmentPlan:
    | {
        id: string;
        activeVersion: { id: string } | null;
      }
    | null;
};

type PersistedSchedulerLaneCursorRecord = {
  lane: PrismaSchedulerLeaseLane;
  lastProjectId: string | null;
};

const activeStateMap = {
  dev: 'IN_DEV',
  review: 'IN_REVIEW',
} as const satisfies Partial<Record<SchedulerLeaseLane, WorkItemState>>;

const queueLimitKeyByLane = {
  planning: 'maxPlanning',
  dev: 'maxInDev',
  review: 'maxInReview',
  release: 'maxReadyForRelease',
} as const satisfies Record<SchedulerLeaseLane, keyof EffectiveProjectQueueLimits>;

@Injectable()
export class SchedulerService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(LogsService)
    private readonly logsService: LogsService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(SettingsService)
    private readonly settingsService: SettingsService,
    @Inject(WorkflowStateMachineService)
    private readonly workflowStateMachineService: WorkflowStateMachineService,
  ) {}

  public async acquireLease(
    payload: AcquireSchedulerLeaseRequest,
  ): Promise<AcquireSchedulerLeaseResponse> {
    const recovered = await this.recoverExpiredLeases();
    const now = new Date();
    const runtimeId = payload.runtimeId.trim();
    const requestedProjectId = payload.projectId?.trim();
    const lanes: SchedulerLeaseLane[] = payload.lanes?.length
      ? payload.lanes
      : ['planning', 'dev', 'review', 'release'];
    const leaseDurationSeconds =
      payload.leaseDurationSeconds ?? defaultLeaseDurationSeconds;

    if (requestedProjectId) {
      await this.projectsService.ensureProjectExists(requestedProjectId);
    }

    const lease = await this.prisma.$transaction(async (transaction) => {
      const candidate = await this.selectCandidateWorkItem(
        transaction,
        lanes,
        requestedProjectId,
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
          runtimeId,
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
        runtimeId,
      );

      return createdLease;
    });

    const mappedLease = lease ? mapSchedulerLease(lease) : null;

    if (mappedLease) {
      await this.logsService.writeLog({
        level: 'info',
        source: 'scheduler',
        projectId: mappedLease.projectId,
        workItemId: mappedLease.workItemId,
        runtimeId,
        eventType: 'scheduler.eligibility.selected',
        message: `Scheduler leased ${mappedLease.workItemTitle} on the ${mappedLease.lane} lane.`,
        payload: {
          requestedProjectId: requestedProjectId ?? null,
          requestedLanes: lanes,
          recoveredCount: recovered.recoveredCount,
          leaseId: mappedLease.id,
        },
      });

      await this.logsService.writeLog({
        level: 'info',
        source: 'scheduler',
        projectId: mappedLease.projectId,
        workItemId: mappedLease.workItemId,
        runtimeId,
        eventType: 'scheduler.lease.granted',
        message: `Scheduler granted lease ${mappedLease.id} to runtime ${runtimeId}.`,
        payload: {
          leaseId: mappedLease.id,
          lane: mappedLease.lane,
          expiresAt: mappedLease.expiresAt,
        },
      });
    } else {
      const state = await this.getSchedulerState(requestedProjectId);

      if (state.skippedProjects.length > 0) {
        await this.logsService.writeLog({
          level: 'info',
          source: 'scheduler',
          projectId: requestedProjectId,
          runtimeId,
          eventType: 'scheduler.projects.skipped',
          message: 'Scheduler skipped one or more projects during lease acquisition.',
          payload: {
            requestedProjectId: requestedProjectId ?? null,
            requestedLanes: lanes,
            skippedProjects: state.skippedProjects,
          },
        });
      }

      await this.logsService.writeLog({
        level: 'debug',
        source: 'scheduler',
        projectId: requestedProjectId,
        runtimeId,
        eventType: 'scheduler.eligibility.none',
        message: 'No eligible work item was available for lease.',
        payload: {
          requestedProjectId: requestedProjectId ?? null,
          requestedLanes: lanes,
          recoveredCount: recovered.recoveredCount,
          laneSummaries: state.laneSummaries,
        },
      });
    }

    return {
      lease: mappedLease,
      recoveredCount: recovered.recoveredCount,
    };
  }

  public async getSchedulerState(
    projectId?: string,
  ): Promise<SchedulerStateResponse> {
    const normalizedProjectId = projectId?.trim() || null;

    if (normalizedProjectId) {
      await this.projectsService.ensureProjectExists(normalizedProjectId);
    }

    const [systemQueueLimits, projects, workItemCounts, activeLeaseCounts, openInterventions, cursors] =
      await Promise.all([
        this.settingsService.getResolvedSystemQueueLimits(),
        this.prisma.project.findMany({
          where: normalizedProjectId ? { id: normalizedProjectId } : {},
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            lifecycleStatus: true,
            productSpec: {
              select: {
                id: true,
              },
            },
            developmentPlan: {
              select: {
                id: true,
                activeVersion: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            queueLimits: {
              select: {
                maxPlanning: true,
                maxInDev: true,
                maxInReview: true,
                maxReadyForRelease: true,
              },
            },
          },
        }),
        this.prisma.workItem.groupBy({
          by: ['projectId', 'state'],
          where: {
            ...(normalizedProjectId ? { projectId: normalizedProjectId } : {}),
            state: {
              in: [
                'PLANNING',
                'READY_FOR_DEV',
                'IN_DEV',
                'READY_FOR_REVIEW',
                'IN_REVIEW',
                'READY_FOR_RELEASE',
              ],
            },
          },
          _count: {
            _all: true,
          },
        }),
        this.prisma.workItemLease.groupBy({
          by: ['projectId', 'lane'],
          where: {
            ...(normalizedProjectId ? { projectId: normalizedProjectId } : {}),
            status: 'ACTIVE',
            expiresAt: {
              gt: new Date(),
            },
          },
          _count: {
            _all: true,
          },
        }),
        this.prisma.humanInterventionCase.groupBy({
          by: ['projectId'],
          where: {
            ...(normalizedProjectId ? { projectId: normalizedProjectId } : {}),
            status: 'OPEN',
          },
          _count: {
            _all: true,
          },
        }),
        this.prisma.schedulerLaneCursor.findMany({
          where: {
            lane: {
              in: ['PLANNING', 'DEV', 'REVIEW', 'RELEASE'],
            },
          },
          orderBy: { lane: 'asc' },
        }),
      ]);

    const workItemCountMap = new Map<string, number>(
      workItemCounts.map((item) => [`${item.projectId}:${item.state}`, item._count._all]),
    );
    const activeLeaseCountMap = new Map<string, number>(
      activeLeaseCounts.map((item) => [`${item.projectId}:${item.lane}`, item._count._all]),
    );
    const openInterventionCountMap = new Map<string, number>(
      openInterventions.map((item) => [item.projectId, item._count._all]),
    );

    const laneSummaries = schedulerLeaseLanes.map((lane) => ({
      lane,
      readyCount: 0,
      inProgressCount: 0,
      activeLeaseCount: 0,
    }));

    const projectsState = projects.map((project) => {
      const laneStates = this.buildProjectLaneStates(
        project.id,
        project.queueLimits,
        systemQueueLimits,
        workItemCountMap,
        activeLeaseCountMap,
      );
      const lifecycleStatus = project.lifecycleStatus.toLowerCase() as ProjectLifecycleStatus;
      const openInterventionCount = openInterventionCountMap.get(project.id) ?? 0;

      for (const laneState of laneStates) {
        const summary = laneSummaries.find((item) => item.lane === laneState.lane);

        if (!summary) {
          continue;
        }

        summary.readyCount += laneState.readyCount;
        summary.inProgressCount += laneState.inProgressCount;
        summary.activeLeaseCount += laneState.activeLeaseCount;
      }

      return {
        projectId: project.id,
        projectName: project.name,
        lifecycleStatus,
        openInterventionCount,
        hasPlanningContext: this.hasPlanningContext(project),
        laneStates,
      };
    });

    const skippedProjects = projectsState
      .map((project) => ({
        projectId: project.projectId,
        projectName: project.projectName,
        reasons: this.getProjectSkipReasons(project),
      }))
      .filter(
        (project): project is SchedulerSkippedProject => project.reasons.length > 0,
      );

    return {
      projectId: normalizedProjectId,
      generatedAt: new Date().toISOString(),
      cursors: cursors.map((cursor) => this.mapSchedulerCursor(cursor)),
      laneSummaries,
      projects: projectsState,
      skippedProjects,
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
      await this.logLeaseFailure(
        'scheduler.lease.renew.failed',
        'Scheduler lease not found.',
        leaseId,
        payload.runtimeId,
      );
      throw new NotFoundException('Scheduler lease not found.');
    }

    if (lease.runtimeId !== payload.runtimeId.trim()) {
      await this.logLeaseFailure(
        'scheduler.lease.renew.failed',
        'Scheduler lease is owned by another runtime.',
        leaseId,
        payload.runtimeId,
        lease.projectId,
        lease.workItemId,
      );
      throw new ConflictException('Scheduler lease is owned by another runtime.');
    }

    if (lease.leaseToken !== payload.leaseToken.trim()) {
      await this.logLeaseFailure(
        'scheduler.lease.renew.failed',
        'Scheduler lease token is invalid.',
        leaseId,
        payload.runtimeId,
        lease.projectId,
        lease.workItemId,
      );
      throw new ConflictException('Scheduler lease token is invalid.');
    }

    if (lease.status !== 'ACTIVE') {
      await this.logLeaseFailure(
        'scheduler.lease.renew.failed',
        'Only active scheduler leases can be renewed.',
        leaseId,
        payload.runtimeId,
        lease.projectId,
        lease.workItemId,
      );
      throw new ConflictException('Only active scheduler leases can be renewed.');
    }

    if (lease.expiresAt.getTime() <= Date.now()) {
      await this.logLeaseFailure(
        'scheduler.lease.renew.failed',
        'Scheduler lease has already expired.',
        leaseId,
        payload.runtimeId,
        lease.projectId,
        lease.workItemId,
      );
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

    await this.logsService.writeLog({
      level: 'info',
      source: 'scheduler',
      projectId: renewedLease.projectId,
      workItemId: renewedLease.workItemId,
      runtimeId: payload.runtimeId.trim(),
      eventType: 'scheduler.lease.renewed',
      message: 'Scheduler lease renewed successfully.',
      payload: {
        leaseId,
        expiresAt: renewedLease.expiresAt.toISOString(),
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

        await this.logsService.writeLog({
          level: 'warn',
          source: 'scheduler',
          projectId: updatedLease.projectId,
          workItemId: updatedLease.workItemId,
          runtimeId: updatedLease.runtimeId,
          eventType: 'scheduler.lease.recovered',
          message: `Recovered expired lease ${updatedLease.id} for work item ${updatedLease.workItemId}.`,
          payload: {
            leaseId: updatedLease.id,
            lane: updatedLease.lane,
            recoveryReason: updatedLease.recoveryReason,
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

  private buildProjectLaneStates(
    projectId: string,
    queueLimits: {
      maxPlanning: number | null;
      maxInDev: number | null;
      maxInReview: number | null;
      maxReadyForRelease: number | null;
    } | null,
    systemQueueLimits: ProjectQueueLimits,
    workItemCountMap: Map<string, number>,
    activeLeaseCountMap: Map<string, number>,
  ): SchedulerProjectLaneState[] {
    return schedulerLeaseLanes.map((lane) => {
      const readyState = laneStateMap[lane][0];
      const inProgressState = activeStateMap[lane];

      return {
        lane,
        readyCount: workItemCountMap.get(`${projectId}:${readyState}`) ?? 0,
        inProgressCount: inProgressState
          ? (workItemCountMap.get(`${projectId}:${inProgressState}`) ?? 0)
          : 0,
        activeLeaseCount:
          activeLeaseCountMap.get(`${projectId}:${laneLeaseMap[lane]}`) ?? 0,
        limit: this.getProjectLaneLimit(queueLimits, systemQueueLimits, lane),
      };
    });
  }

  private getProjectLaneLimit(
    queueLimits: {
      maxPlanning: number | null;
      maxInDev: number | null;
      maxInReview: number | null;
      maxReadyForRelease: number | null;
    } | null,
    systemQueueLimits: ProjectQueueLimits,
    lane: SchedulerLeaseLane,
  ): number {
    switch (lane) {
      case 'planning':
        return queueLimits?.maxPlanning ?? systemQueueLimits.maxPlanning;
      case 'review':
        return queueLimits?.maxInReview ?? systemQueueLimits.maxInReview;
      case 'release':
        return (
          queueLimits?.maxReadyForRelease ?? systemQueueLimits.maxReadyForRelease
        );
      default:
        return queueLimits?.maxInDev ?? systemQueueLimits.maxInDev;
    }
  }

  private getProjectSkipReasons(project: {
    lifecycleStatus: ProjectLifecycleStatus;
    openInterventionCount: number;
    hasPlanningContext: boolean;
    laneStates: SchedulerProjectLaneState[];
  }): SchedulerProjectSkipReason[] {
    const reasons = new Set<SchedulerProjectSkipReason>();
    const hasReadyWork = project.laneStates.some((laneState) => laneState.readyCount > 0);

    if (hasReadyWork && project.lifecycleStatus !== 'active') {
      reasons.add('paused');
    }

    if (hasReadyWork && project.openInterventionCount > 0) {
      reasons.add('openIntervention');
    }

    if (
      project.laneStates.some((laneState) => {
        const activeCount =
          laneState.lane === 'planning' || laneState.lane === 'release'
            ? laneState.activeLeaseCount
            : laneState.inProgressCount;

        return laneState.readyCount > 0 && activeCount >= laneState.limit;
      })
    ) {
      reasons.add('queueCapReached');
    }

    const planningLaneState = project.laneStates.find(
      (laneState) => laneState.lane === 'planning',
    );

    if (
      planningLaneState &&
      planningLaneState.readyCount > 0 &&
      !project.hasPlanningContext
    ) {
      reasons.add('missingPlanningContext');
    }

    return [...reasons];
  }

  private mapSchedulerCursor(
    cursor: PersistedSchedulerLaneCursorRecord,
  ): SchedulerLaneCursor {
    return {
      lane: cursor.lane.toLowerCase() as SchedulerLeaseLane,
      lastProjectId: cursor.lastProjectId,
    };
  }

  private async logLeaseFailure(
    eventType: string,
    message: string,
    leaseId: string,
    runtimeId: string,
    projectId?: string,
    workItemId?: string,
  ): Promise<void> {
    await this.logsService.writeLog({
      level: 'warn',
      source: 'scheduler',
      projectId,
      workItemId,
      runtimeId: runtimeId.trim(),
      eventType,
      message,
      payload: {
        leaseId,
      },
    });
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
    const systemQueueLimits = await this.settingsService.getResolvedSystemQueueLimits();
    const eligibleStates = lanes.flatMap(
      (lane) => laneStateMap[lane],
    ) as WorkItemState[];
    const candidates = await transaction.workItem.findMany({
      where: {
        projectId,
        OR: [
          {
            retryState: {
              is: null,
            },
          },
          {
            retryState: {
              is: {
                nextRetryAt: null,
              },
            },
          },
          {
            retryState: {
              is: {
                nextRetryAt: {
                  lte: now,
                },
              },
            },
          },
        ],
        state: {
          in: eligibleStates,
        },
        project: {
          lifecycleStatus: 'ACTIVE',
        },
        dependencies: {
          none: {
            dependsOnWorkItem: {
              state: {
                not: 'RELEASED',
              },
            },
          },
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
        epic: {
          select: {
            title: true,
          },
        },
      },
      orderBy: [{ stateUpdatedAt: 'asc' }, { sortOrder: 'asc' }],
    });

    if (candidates.length === 0) {
      return null;
    }

    const candidateProjectIds = [...new Set(candidates.map((item) => item.projectId))];
    const [projects, activeStateCounts, activeLeaseCountsByLane] = await Promise.all([
      transaction.project.findMany({
        where: {
          id: {
            in: candidateProjectIds,
          },
        },
        select: {
          id: true,
          productSpec: {
            select: {
              id: true,
            },
          },
          developmentPlan: {
            select: {
              id: true,
              activeVersion: {
                select: {
                  id: true,
                },
              },
            },
          },
          queueLimits: {
            select: {
              maxPlanning: true,
              maxInDev: true,
              maxInReview: true,
              maxReadyForRelease: true,
            },
          },
        },
      }),
      transaction.workItem.groupBy({
        by: ['projectId', 'state'],
        where: {
          projectId: {
            in: candidateProjectIds,
          },
          state: {
            in: ['IN_DEV', 'IN_REVIEW'],
          },
        },
        _count: {
          _all: true,
        },
      }),
      transaction.workItemLease.groupBy({
        by: ['projectId', 'lane'],
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
      }),
    ]);

    const projectQueueLimitMap = new Map<string, ProjectQueueLimitsRecord>(
      projects.map((project) => [
        project.id,
        {
          maxPlanning: project.queueLimits?.maxPlanning ?? systemQueueLimits.maxPlanning,
          maxInDev: project.queueLimits?.maxInDev ?? systemQueueLimits.maxInDev,
          maxInReview: project.queueLimits?.maxInReview ?? systemQueueLimits.maxInReview,
          maxReadyForRelease:
            project.queueLimits?.maxReadyForRelease ??
            systemQueueLimits.maxReadyForRelease,
        },
      ]),
    );
    const projectPlanningContextMap = new Map<string, boolean>(
      projects.map((project) => [project.id, this.hasPlanningContext(project)]),
    );

    const activeStateCountMap = new Map<string, number>(
      activeStateCounts.map((item) => [
        `${item.projectId}:${item.state}`,
        item._count._all,
      ]),
    );

    const activeLeaseCountMap = new Map<string, number>();
    const activeLeaseCountByProjectLaneMap = new Map<string, number>(
      activeLeaseCountsByLane.map((item) => {
        activeLeaseCountMap.set(
          item.projectId,
          (activeLeaseCountMap.get(item.projectId) ?? 0) + item._count._all,
        );

        return [`${item.projectId}:${item.lane}`, item._count._all];
      }),
    );

    const laneOrder = new Map(lanes.map((lane, index) => [lane, index]));

    const eligibleCandidates = candidates.filter((candidate) => {
      const lane = this.getLaneForState(candidate.state);
      const queueLimits = projectQueueLimitMap.get(candidate.projectId);

      if (!queueLimits) {
        return false;
      }

      if (lane === 'planning' && !this.isPlanningRequestCandidate(candidate)) {
        return false;
      }

      if (
        lane === 'planning' &&
        !(projectPlanningContextMap.get(candidate.projectId) ?? false)
      ) {
        return false;
      }

      const activeCount = this.getProjectLaneActiveCount(
        candidate.projectId,
        lane,
        activeStateCountMap,
        activeLeaseCountByProjectLaneMap,
      );

      return activeCount < queueLimits[queueLimitKeyByLane[lane]];
    });

    if (eligibleCandidates.length === 0) {
      if (!projectId) {
        await this.resetRoundRobinCursors(transaction, lanes);
      }

      return null;
    }

    const sortedCandidates = [...eligibleCandidates].sort((left, right) => {
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

    if (projectId) {
      return sortedCandidates[0] ?? null;
    }

    return this.selectRoundRobinCandidate(
      transaction,
      sortedCandidates,
      lanes,
      activeLeaseCountMap,
    );
  }

  private async selectRoundRobinCandidate(
    transaction: Prisma.TransactionClient,
    candidates: CandidateWorkItem[],
    lanes: SchedulerLeaseLane[],
    activeLeaseCountMap: Map<string, number>,
  ): Promise<CandidateWorkItem | null> {
    const cursors = await transaction.schedulerLaneCursor.findMany({
      where: {
        lane: {
          in: lanes.map((lane) => laneLeaseMap[lane]),
        },
      },
    });
    const cursorMap = new Map<PrismaSchedulerLeaseLane, string | null>(
      cursors.map((cursor) => [cursor.lane, cursor.lastProjectId]),
    );

    for (const lane of lanes) {
      const prismaLane = laneLeaseMap[lane];
      const laneCandidates = candidates.filter(
        (candidate) => this.getLaneForState(candidate.state) === lane,
      );

      if (laneCandidates.length === 0) {
        await this.persistRoundRobinCursor(transaction, prismaLane, null);
        continue;
      }

      const projectIds = [...new Set(laneCandidates.map((candidate) => candidate.projectId))];
      const minimumActiveLeaseCount = Math.min(
        ...projectIds.map((candidateProjectId) => {
          return activeLeaseCountMap.get(candidateProjectId) ?? 0;
        }),
      );
      const fairProjectIds = projectIds.filter((candidateProjectId) => {
        return (activeLeaseCountMap.get(candidateProjectId) ?? 0) === minimumActiveLeaseCount;
      });
      const lastProjectId = cursorMap.get(prismaLane) ?? null;

      if (lastProjectId && !fairProjectIds.includes(lastProjectId)) {
        await this.persistRoundRobinCursor(transaction, prismaLane, null);
      }

      const orderedProjectIds = this.orderProjectIdsByCursor(
        fairProjectIds,
        fairProjectIds.includes(lastProjectId ?? '') ? lastProjectId : null,
      );

      for (const projectId of orderedProjectIds) {
        const candidate = laneCandidates.find(
          (laneCandidate) => laneCandidate.projectId === projectId,
        );

        if (!candidate) {
          continue;
        }

        await this.persistRoundRobinCursor(transaction, prismaLane, projectId);
        return candidate;
      }
    }

    return candidates[0] ?? null;
  }

  private isPlanningRequestCandidate(candidate: CandidateWorkItem): boolean {
    return candidate.epic?.title === planningRequestEpicTitle;
  }

  private getProjectLaneActiveCount(
    projectId: string,
    lane: SchedulerLeaseLane,
    activeStateCountMap: Map<string, number>,
    activeLeaseCountByProjectLaneMap: Map<string, number>,
  ): number {
    if (lane === 'planning' || lane === 'release') {
      return (
        activeLeaseCountByProjectLaneMap.get(
          `${projectId}:${laneLeaseMap[lane]}`,
        ) ?? 0
      );
    }

    const state = activeStateMap[lane];

    return state ? (activeStateCountMap.get(`${projectId}:${state}`) ?? 0) : 0;
  }

  private orderProjectIdsByCursor(
    projectIds: string[],
    lastProjectId: string | null,
  ): string[] {
    const sortedProjectIds = [...projectIds].sort((left, right) => {
      return left.localeCompare(right);
    });

    if (!lastProjectId) {
      return sortedProjectIds;
    }

    const lastProjectIndex = sortedProjectIds.indexOf(lastProjectId);

    if (lastProjectIndex === -1) {
      return sortedProjectIds;
    }

    return [
      ...sortedProjectIds.slice(lastProjectIndex + 1),
      ...sortedProjectIds.slice(0, lastProjectIndex + 1),
    ];
  }

  private async resetRoundRobinCursors(
    transaction: Prisma.TransactionClient,
    lanes: SchedulerLeaseLane[],
  ): Promise<void> {
    await Promise.all(
      lanes.map((lane) => {
        return this.persistRoundRobinCursor(transaction, laneLeaseMap[lane], null);
      }),
    );
  }

  private async persistRoundRobinCursor(
    transaction: Prisma.TransactionClient,
    lane: PrismaSchedulerLeaseLane,
    lastProjectId: string | null,
  ): Promise<PersistedSchedulerLaneCursorRecord> {
    return transaction.schedulerLaneCursor.upsert({
      where: { lane },
      create: {
        lane,
        lastProjectId,
      },
      update: {
        lastProjectId,
      },
    });
  }

  private getLaneForState(state: WorkItemState): SchedulerLeaseLane {
    switch (state) {
      case 'PLANNING':
        return 'planning';
      case 'READY_FOR_REVIEW':
        return 'review';
      case 'READY_FOR_RELEASE':
        return 'release';
      default:
        return 'dev';
    }
  }

  private hasPlanningContext(project: PlanningContextProjectRecord): boolean {
    return Boolean(project.productSpec && project.developmentPlan?.activeVersion);
  }

  private async moveWorkItemIntoActiveExecution(
    transaction: Prisma.TransactionClient,
    workItem: CandidateWorkItem,
    runtimeId: string,
  ): Promise<void> {
    if (workItem.state === 'PLANNING') {
      return;
    }

    if (workItem.state === 'READY_FOR_RELEASE') {
      return;
    }

    const toState = workItem.state === 'READY_FOR_REVIEW' ? 'inReview' : 'inDev';
    const fromState = workItem.state === 'READY_FOR_REVIEW' ? 'readyForReview' : 'readyForDev';
    const persistedToState = toState === 'inReview' ? 'IN_REVIEW' : 'IN_DEV';

    await this.logsService.writeLog({
      level: 'info',
      source: 'scheduler',
      projectId: workItem.projectId,
      workItemId: workItem.id,
      runtimeId,
      eventType: 'scheduler.transition.attempt',
      message: `Scheduler is attempting to move work item ${workItem.id} into active execution.`,
      payload: {
        fromState: workItem.state,
        toState: persistedToState,
        reason: 'lease-granted',
      },
    });

    this.workflowStateMachineService.assertTransition(fromState, {
      toState,
    });

    await transaction.workItem.update({
      where: { id: workItem.id },
      data: {
        state: persistedToState,
        stateUpdatedAt: new Date(),
      },
    });

    await transaction.workItemStateTransition.create({
      data: {
        projectId: workItem.projectId,
        workItemId: workItem.id,
        fromState: workItem.state,
        toState: persistedToState,
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

    await this.logsService.writeLog({
      level: 'info',
      source: 'scheduler',
      projectId: lease.projectId,
      workItemId: lease.workItemId,
      runtimeId: lease.runtimeId,
      eventType: 'scheduler.transition.attempt',
      message: `Scheduler is attempting to recover work item ${lease.workItemId} after an expired lease.`,
      payload: {
        fromState: currentState,
        toState: recoveryTargetState,
        reason: 'expired-lease-recovery',
        leaseId: lease.id,
      },
    });

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
