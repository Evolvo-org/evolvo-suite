import { Body, Controller, Get, Inject, Param, Post, Put } from '@nestjs/common';
import type {
  MarkWorktreeStaleRequest,
  RequestWorktreeCleanupRequest,
  UpsertWorktreeRequest,
} from '@repo/shared';
import {
  markWorktreeStaleSchema,
  requestWorktreeCleanupSchema,
  upsertWorktreeSchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { WorktreesService } from './worktrees.service.js';

@Controller('projects/:projectId/worktrees')
export class WorktreesController {
  public constructor(
    @Inject(WorktreesService)
    private readonly worktreesService: WorktreesService,
  ) {}

  @Put()
  public async upsertWorktree(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(upsertWorktreeSchema))
    body: UpsertWorktreeRequest,
  ) {
    const worktree = await this.worktreesService.upsertWorktree(projectId, body);

    return {
      success: true as const,
      message: 'Worktree state saved successfully.',
      data: worktree,
    };
  }

  @Get()
  public listWorktrees(@Param('projectId') projectId: string) {
    return this.worktreesService.listProjectWorktrees(projectId);
  }

  @Get(':worktreeId')
  public getWorktree(
    @Param('projectId') projectId: string,
    @Param('worktreeId') worktreeId: string,
  ) {
    return this.worktreesService.getWorktree(projectId, worktreeId);
  }

  @Post(':worktreeId/cleanup')
  public async requestCleanup(
    @Param('projectId') projectId: string,
    @Param('worktreeId') worktreeId: string,
    @Body(new ZodValidationPipe(requestWorktreeCleanupSchema))
    body: RequestWorktreeCleanupRequest,
  ) {
    const worktree = await this.worktreesService.requestWorktreeCleanup(
      projectId,
      worktreeId,
      body,
    );

    return {
      success: true as const,
      message: 'Worktree cleanup requested successfully.',
      data: worktree,
    };
  }

  @Post(':worktreeId/stale')
  public async markStale(
    @Param('projectId') projectId: string,
    @Param('worktreeId') worktreeId: string,
    @Body(new ZodValidationPipe(markWorktreeStaleSchema))
    body: MarkWorktreeStaleRequest,
  ) {
    const worktree = await this.worktreesService.markWorktreeStale(
      projectId,
      worktreeId,
      body,
    );

    return {
      success: true as const,
      message: 'Worktree marked stale successfully.',
      data: worktree,
    };
  }
}
