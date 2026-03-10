import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import type { ExecuteDevTaskRequest } from '@repo/shared';
import { executeDevTaskSchema } from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { DevAgentService } from './dev-agent.service.js';

@Controller('projects/:projectId/agents/dev')
export class DevAgentController {
  public constructor(
    @Inject(DevAgentService)
    private readonly devAgentService: DevAgentService,
  ) {}

  @Post('work-items/:workItemId/execute')
  public async executeTask(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(executeDevTaskSchema))
    body: ExecuteDevTaskRequest,
  ) {
    const result = await this.devAgentService.executeTask(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Dev task executed successfully.',
      data: result,
    };
  }
}
