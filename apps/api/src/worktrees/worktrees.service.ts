import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  MarkWorktreeStaleRequest,
  RequestWorktreeCleanupRequest,
  UpsertWorktreeRequest,
  WorktreeListResponse,
  WorktreeResponse,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';

import {
  mapWorktreeListResponse,
  mapWorktreeResponse,
} from './worktrees.mapper.js';

const toPrismaStatus = (value: UpsertWorktreeRequest['status']) => {
  switch (value) {
    case 'active':
      return 'ACTIVE' as const;
    case 'lockedByDev':
      return 'LOCKED_BY_DEV' as const;
    case 'lockedByReview':
      return 'LOCKED_BY_REVIEW' as const;
    case 'lockedByRelease':
      return 'LOCKED_BY_RELEASE' as const;
    case 'stale':
      return 'STALE' as const;
    case 'cleanupPending':
      return 'CLEANUP_PENDING' as const;
    case 'archived':
      return 'ARCHIVED' as const;
    case 'failed':
      return 'FAILED' as const;
    default:
      return 'PENDING' as const;
  }
};

@Injectable()
export class WorktreesService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
  ) {}

  public async upsertWorktree(
    projectId: string,
    payload: UpsertWorktreeRequest,
  ): Promise<WorktreeResponse> {
    await this.projectsService.ensureProjectExists(projectId);
    await this.assertWorkItemBelongsToProject(projectId, payload.workItemId);
    await this.assertRuntimeIfProvided(payload.runtimeId);
    await this.assertLeaseIfProvided(projectId, payload.leaseId, payload.workItemId);

    const status = toPrismaStatus(payload.status);
    const now = new Date();
    const worktree = await this.prisma.worktree.upsert({
      where: {
        workItemId: payload.workItemId,
      },
      create: {
        projectId,
        workItemId: payload.workItemId,
        runtimeId: payload.runtimeId?.trim(),
        leaseId: payload.leaseId?.trim(),
        status,
        path: payload.path.trim(),
        branchName: payload.branchName.trim(),
        baseBranch: payload.baseBranch.trim(),
        headSha: payload.headSha?.trim(),
        pullRequestUrl: payload.pullRequestUrl?.trim(),
        isDirty: payload.isDirty ?? false,
        details: payload.details?.trim(),
        lastSeenAt: now,
        cleanupRequestedAt: status === 'CLEANUP_PENDING' ? now : null,
        cleanupCompletedAt: status === 'ARCHIVED' ? now : null,
      },
      update: {
        runtimeId: payload.runtimeId?.trim() ?? null,
        leaseId: payload.leaseId?.trim() ?? null,
        status,
        path: payload.path.trim(),
        branchName: payload.branchName.trim(),
        baseBranch: payload.baseBranch.trim(),
        headSha: payload.headSha?.trim() ?? null,
        pullRequestUrl: payload.pullRequestUrl?.trim() ?? null,
        isDirty: payload.isDirty ?? false,
        details: payload.details?.trim() ?? null,
        lastSeenAt: now,
        cleanupRequestedAt:
          status === 'CLEANUP_PENDING' ? now : status === 'ARCHIVED' ? now : null,
        cleanupCompletedAt: status === 'ARCHIVED' ? now : null,
      },
    });

    return mapWorktreeResponse(worktree);
  }

  public async listProjectWorktrees(projectId: string): Promise<WorktreeListResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const worktrees = await this.prisma.worktree.findMany({
      where: { projectId },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return mapWorktreeListResponse(projectId, worktrees);
  }

  public async getWorktree(
    projectId: string,
    worktreeId: string,
  ): Promise<WorktreeResponse> {
    const worktree = await this.prisma.worktree.findFirst({
      where: {
        id: worktreeId,
        projectId,
      },
    });

    if (!worktree) {
      throw new NotFoundException('Worktree not found.');
    }

    return mapWorktreeResponse(worktree);
  }

  public async requestWorktreeCleanup(
    projectId: string,
    worktreeId: string,
    payload: RequestWorktreeCleanupRequest,
  ): Promise<WorktreeResponse> {
    const worktree = await this.getExistingWorktree(projectId, worktreeId);

    const updated = await this.prisma.worktree.update({
      where: { id: worktree.id },
      data: {
        status: 'CLEANUP_PENDING',
        details: payload.reason?.trim() ?? worktree.details,
        cleanupRequestedAt: new Date(),
      },
    });

    return mapWorktreeResponse(updated);
  }

  public async markWorktreeStale(
    projectId: string,
    worktreeId: string,
    payload: MarkWorktreeStaleRequest,
  ): Promise<WorktreeResponse> {
    const worktree = await this.getExistingWorktree(projectId, worktreeId);

    const updated = await this.prisma.worktree.update({
      where: { id: worktree.id },
      data: {
        status: 'STALE',
        details: payload.reason?.trim() ?? worktree.details,
        lastSeenAt: new Date(),
      },
    });

    return mapWorktreeResponse(updated);
  }

  private async getExistingWorktree(projectId: string, worktreeId: string) {
    const worktree = await this.prisma.worktree.findFirst({
      where: { id: worktreeId, projectId },
    });

    if (!worktree) {
      throw new NotFoundException('Worktree not found.');
    }

    return worktree;
  }

  private async assertWorkItemBelongsToProject(
    projectId: string,
    workItemId: string,
  ): Promise<void> {
    const workItem = await this.prisma.workItem.findFirst({
      where: { id: workItemId, projectId },
      select: { id: true },
    });

    if (!workItem) {
      throw new NotFoundException('Work item not found for project.');
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

  private async assertLeaseIfProvided(
    projectId: string,
    leaseId: string | undefined,
    workItemId: string,
  ): Promise<void> {
    if (!leaseId) {
      return;
    }

    const lease = await this.prisma.workItemLease.findFirst({
      where: {
        id: leaseId.trim(),
        projectId,
        workItemId,
      },
      select: { id: true },
    });

    if (!lease) {
      throw new ConflictException('Lease does not match the project work item.');
    }
  }
}
