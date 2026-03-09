import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import type {
  CreateWorkItemCommentRequest,
  TransitionWorkItemRequest,
} from '@repo/shared';
import {
  createWorkItemCommentSchema,
  transitionWorkItemSchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { WorkflowService } from './workflow.service.js';

@Controller('projects/:projectId')
export class WorkflowController {
  public constructor(
    @Inject(WorkflowService)
    private readonly workflowService: WorkflowService,
  ) {}

  @Get('board')
  public getBoard(@Param('projectId') projectId: string) {
    return this.workflowService.getBoard(projectId);
  }

  @Get('board/counts')
  public getBoardCounts(@Param('projectId') projectId: string) {
    return this.workflowService.getBoardCounts(projectId);
  }

  @Get('work-items/:workItemId')
  public getWorkItemDetail(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
  ) {
    return this.workflowService.getWorkItemDetail(projectId, workItemId);
  }

  @Get('work-items/:workItemId/comments')
  public getWorkItemComments(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
  ) {
    return this.workflowService.listWorkItemComments(projectId, workItemId);
  }

  @Post('work-items/:workItemId/comments')
  public async createWorkItemComment(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(createWorkItemCommentSchema))
    body: CreateWorkItemCommentRequest,
  ) {
    const comments = await this.workflowService.createWorkItemComment(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Work item comment created successfully.',
      data: comments,
    };
  }

  @Get('work-items/:workItemId/audit')
  public getWorkItemAuditTrail(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
  ) {
    return this.workflowService.getWorkItemAuditTrail(projectId, workItemId);
  }

  @Post('work-items/:workItemId/transition')
  public async transitionWorkItem(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(transitionWorkItemSchema))
    body: TransitionWorkItemRequest,
  ) {
    const board = await this.workflowService.transitionWorkItem(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Work item transitioned successfully.',
      data: board,
    };
  }
}
