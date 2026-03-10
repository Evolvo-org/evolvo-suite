import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import type { ExecutePlanningRequest } from '@repo/shared';
import { executePlanningSchema } from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { PlanningAgentService } from './planning-agent.service.js';

@Controller('projects/:projectId/agents/planning')
export class PlanningAgentController {
  public constructor(
    @Inject(PlanningAgentService)
    private readonly planningAgentService: PlanningAgentService,
  ) {}

  @Post('work-items/:workItemId/execute')
  public async executePlanning(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(executePlanningSchema))
    body: ExecutePlanningRequest,
  ) {
    const result = await this.planningAgentService.executePlanning(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Planning executed successfully.',
      data: result,
    };
  }
}
