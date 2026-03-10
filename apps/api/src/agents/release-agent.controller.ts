import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import type { ExecuteReleaseRequest } from '@repo/shared';
import { executeReleaseSchema } from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { ReleaseAgentService } from './release-agent.service.js';

@Controller('projects/:projectId/agents/release')
export class ReleaseAgentController {
  public constructor(
    @Inject(ReleaseAgentService)
    private readonly releaseAgentService: ReleaseAgentService,
  ) {}

  @Post('work-items/:workItemId/execute')
  public async executeRelease(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(executeReleaseSchema))
    body: ExecuteReleaseRequest,
  ) {
    const result = await this.releaseAgentService.executeRelease(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Release executed successfully.',
      data: result,
    };
  }
}
