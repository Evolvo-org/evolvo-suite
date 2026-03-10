import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import type { CreateReviewGateResultRequest } from '@repo/shared';
import { createReviewGateResultSchema } from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { ReviewGatesService } from './review-gates.service.js';

@Controller('projects/:projectId/work-items/:workItemId/review-gates')
export class ReviewGatesController {
  public constructor(
    @Inject(ReviewGatesService)
    private readonly reviewGatesService: ReviewGatesService,
  ) {}

  @Post()
  public async createResult(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(createReviewGateResultSchema))
    body: CreateReviewGateResultRequest,
  ) {
    const result = await this.reviewGatesService.createResult(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Review gate result recorded successfully.',
      data: result,
    };
  }

  @Get()
  public listResults(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
  ) {
    return this.reviewGatesService.listResults(projectId, workItemId);
  }

  @Get('summary')
  public getSummary(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
  ) {
    return this.reviewGatesService.getSummary(projectId, workItemId);
  }
}
