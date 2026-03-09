import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import type { TransitionWorkItemRequest } from '@repo/shared';
import { transitionWorkItemSchema } from '@repo/validation';

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
