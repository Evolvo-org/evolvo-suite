import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateReleaseRunRequest,
  CreateReleaseVersionRequest,
  RecordReleaseResultRequest,
  ReleaseHistoryResponse,
  ReleaseRunRecord,
  UpsertReleaseNoteRequest,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { WorkflowStateMachineService } from '../workflow/workflow-state-machine.service.js';

import { mapReleaseHistory, mapReleaseRun } from './releases.mapper.js';

const toPrismaReleaseStatus = (value: RecordReleaseResultRequest['status']) => {
  switch (value) {
    case 'failed':
      return 'FAILED' as const;
    case 'cancelled':
      return 'CANCELLED' as const;
    default:
      return 'SUCCEEDED' as const;
  }
};

const toPrismaNoteFormat = (value: UpsertReleaseNoteRequest['format']) => {
  switch (value) {
    case 'plainText':
      return 'PLAIN_TEXT' as const;
    default:
      return 'MARKDOWN' as const;
  }
};

@Injectable()
export class ReleasesService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(WorkflowStateMachineService)
    private readonly workflowStateMachineService: WorkflowStateMachineService,
  ) {}

  public async startRelease(
    projectId: string,
    workItemId: string,
    payload: CreateReleaseRunRequest,
  ): Promise<ReleaseRunRecord> {
    await this.projectsService.ensureProjectExists(projectId);
    const workItem = await this.getWorkItem(projectId, workItemId);

    if (workItem.state !== 'READY_FOR_RELEASE') {
      throw new ConflictException('Work item must be ready for release.');
    }

    await this.assertRuntimeIfProvided(payload.runtimeId);
    await this.assertLeaseIfProvided(projectId, workItemId, payload.leaseId);
    await this.assertWorktreeIfProvided(projectId, workItemId, payload.worktreeId);

    const releaseRun = await this.prisma.releaseRun.create({
      data: {
        projectId,
        workItemId,
        runtimeId: payload.runtimeId?.trim(),
        leaseId: payload.leaseId?.trim(),
        worktreeId: payload.worktreeId?.trim(),
        summary: payload.summary?.trim(),
        startedAt: payload.startedAt ? new Date(payload.startedAt) : new Date(),
      },
      include: this.releaseInclude,
    });

    return mapReleaseRun(releaseRun);
  }

  public async recordResult(
    projectId: string,
    workItemId: string,
    releaseRunId: string,
    payload: RecordReleaseResultRequest,
  ): Promise<ReleaseRunRecord> {
    const releaseRun = await this.getReleaseRun(projectId, workItemId, releaseRunId);

    if (releaseRun.status !== 'RUNNING') {
      throw new ConflictException('Release result is already recorded for this run.');
    }

    const currentState = this.mapWorkItemState(releaseRun.workItem.state);
    const nextState = payload.status === 'succeeded' ? 'released' : 'requiresHumanIntervention';
    const reason =
      payload.errorMessage?.trim() ??
      payload.summary?.trim() ??
      `Release ${payload.status} for ${releaseRun.workItem.title}.`;

    this.workflowStateMachineService.assertTransition(currentState, {
      toState: nextState,
      reason,
    });

    const now = payload.completedAt ? new Date(payload.completedAt) : new Date();

    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.releaseRun.update({
        where: { id: releaseRunId },
        data: {
          status: toPrismaReleaseStatus(payload.status),
          summary: payload.summary?.trim() ?? releaseRun.summary,
          errorMessage: payload.errorMessage?.trim() ?? null,
          mergeCommitSha: payload.mergeCommitSha?.trim() ?? null,
          releaseUrl: payload.releaseUrl?.trim() ?? null,
          completedAt: now,
        },
      });

      await transaction.workItem.update({
        where: { id: workItemId },
        data: {
          state: nextState === 'released' ? 'RELEASED' : 'REQUIRES_HUMAN_INTERVENTION',
          stateUpdatedAt: now,
        },
      });

      await transaction.workItemStateTransition.create({
        data: {
          projectId,
          workItemId,
          fromState: releaseRun.workItem.state,
          toState: nextState === 'released' ? 'RELEASED' : 'REQUIRES_HUMAN_INTERVENTION',
          reason,
          isOperatorOverride: false,
        },
      });

      await transaction.workItemComment.create({
        data: {
          projectId,
          workItemId,
          actorType: 'SYSTEM',
          actorName: releaseRun.runtimeId ?? 'Release system',
          content: `Release run ${releaseRunId} ${payload.status} for ${releaseRun.workItem.title}. ${reason}`,
        },
      });

      if (releaseRun.leaseId) {
        await transaction.workItemLease.update({
          where: { id: releaseRun.leaseId },
          data: {
            status: 'RELEASED',
            releasedAt: now,
          },
        });
      }

      if (releaseRun.worktreeId && payload.status === 'succeeded') {
        await transaction.worktree.update({
          where: { id: releaseRun.worktreeId },
          data: {
            status: 'ARCHIVED',
            cleanupCompletedAt: now,
            details: 'Release completed successfully and worktree archived.',
          },
        });
      }

      return transaction.releaseRun.findFirst({
        where: { id: releaseRunId, projectId, workItemId },
        include: this.releaseInclude,
      });
    });

    if (!updated) {
      throw new NotFoundException('Release run not found.');
    }

    return mapReleaseRun(updated);
  }

  public async createVersion(
    projectId: string,
    workItemId: string,
    releaseRunId: string,
    payload: CreateReleaseVersionRequest,
  ): Promise<ReleaseRunRecord> {
    const releaseRun = await this.getReleaseRun(projectId, workItemId, releaseRunId);

    if (releaseRun.version) {
      throw new ConflictException('Release version is already recorded for this run.');
    }

    await this.prisma.releaseVersion.create({
      data: {
        releaseRunId,
        version: payload.version.trim(),
        tagName: payload.tagName.trim(),
        targetBranch: payload.targetBranch?.trim(),
        commitSha: payload.commitSha?.trim(),
      },
    });

    return this.findReleaseRun(projectId, workItemId, releaseRunId);
  }

  public async upsertNote(
    projectId: string,
    workItemId: string,
    releaseRunId: string,
    payload: UpsertReleaseNoteRequest,
  ): Promise<ReleaseRunRecord> {
    await this.getReleaseRun(projectId, workItemId, releaseRunId);

    await this.prisma.releaseNote.upsert({
      where: { releaseRunId },
      create: {
        releaseRunId,
        title: payload.title?.trim(),
        content: payload.content.trim(),
        format: toPrismaNoteFormat(payload.format),
      },
      update: {
        title: payload.title?.trim() ?? null,
        content: payload.content.trim(),
        format: toPrismaNoteFormat(payload.format),
      },
    });

    return this.findReleaseRun(projectId, workItemId, releaseRunId);
  }

  public async getHistory(projectId: string): Promise<ReleaseHistoryResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const items = await this.prisma.releaseRun.findMany({
      where: { projectId },
      orderBy: [{ createdAt: 'desc' }],
      include: this.releaseInclude,
    });

    return mapReleaseHistory(projectId, items);
  }

  private get releaseInclude() {
    return {
      workItem: {
        select: {
          title: true,
          state: true,
        },
      },
      version: true,
      note: true,
    };
  }

  private async findReleaseRun(
    projectId: string,
    workItemId: string,
    releaseRunId: string,
  ): Promise<ReleaseRunRecord> {
    const releaseRun = await this.prisma.releaseRun.findFirst({
      where: { id: releaseRunId, projectId, workItemId },
      include: this.releaseInclude,
    });

    if (!releaseRun) {
      throw new NotFoundException('Release run not found.');
    }

    return mapReleaseRun(releaseRun);
  }

  private async getReleaseRun(
    projectId: string,
    workItemId: string,
    releaseRunId: string,
  ) {
    const releaseRun = await this.prisma.releaseRun.findFirst({
      where: { id: releaseRunId, projectId, workItemId },
      include: this.releaseInclude,
    });

    if (!releaseRun) {
      throw new NotFoundException('Release run not found.');
    }

    return releaseRun;
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

  private async assertLeaseIfProvided(
    projectId: string,
    workItemId: string,
    leaseId?: string,
  ): Promise<void> {
    if (!leaseId) {
      return;
    }

    const lease = await this.prisma.workItemLease.findFirst({
      where: { id: leaseId.trim(), projectId, workItemId },
      select: { id: true },
    });

    if (!lease) {
      throw new ConflictException('Lease does not match the project work item.');
    }
  }

  private async assertWorktreeIfProvided(
    projectId: string,
    workItemId: string,
    worktreeId?: string,
  ): Promise<void> {
    if (!worktreeId) {
      return;
    }

    const worktree = await this.prisma.worktree.findFirst({
      where: { id: worktreeId.trim(), projectId, workItemId },
      select: { id: true },
    });

    if (!worktree) {
      throw new ConflictException('Worktree does not match the project work item.');
    }
  }

  private mapWorkItemState(value: string) {
    switch (value) {
      case 'READY_FOR_RELEASE':
        return 'readyForRelease' as const;
      case 'RELEASED':
        return 'released' as const;
      case 'IN_REVIEW':
        return 'inReview' as const;
      default:
        return 'requiresHumanIntervention' as const;
    }
  }
}
