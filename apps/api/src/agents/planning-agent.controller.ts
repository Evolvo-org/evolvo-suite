import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import type { TriageInboxIdeaRequest } from '@repo/shared';
import { triageInboxIdeaSchema } from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { PlanningAgentService } from './planning-agent.service.js';

@Controller('projects/:projectId/agents/planning')
export class PlanningAgentController {
  public constructor(
    @Inject(PlanningAgentService)
    private readonly planningAgentService: PlanningAgentService,
  ) {}

  @Post('work-items/:workItemId/triage')
  public async triageInboxIdea(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(triageInboxIdeaSchema))
    body: TriageInboxIdeaRequest,
  ) {
    const result = await this.planningAgentService.triageInboxIdea(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Inbox idea triaged successfully.',
      data: result,
    };
  }
}
