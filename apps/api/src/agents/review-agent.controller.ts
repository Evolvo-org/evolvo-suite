import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import type { ExecuteReviewRequest } from '@repo/shared';
import { executeReviewSchema } from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { ReviewAgentService } from './review-agent.service.js';

@Controller('projects/:projectId/agents/review')
export class ReviewAgentController {
  public constructor(
    @Inject(ReviewAgentService)
    private readonly reviewAgentService: ReviewAgentService,
  ) {}

  @Post('work-items/:workItemId/execute')
  public async executeReview(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(executeReviewSchema))
    body: ExecuteReviewRequest,
  ) {
    const result = await this.reviewAgentService.executeReview(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Review executed successfully.',
      data: result,
    };
  }
}
