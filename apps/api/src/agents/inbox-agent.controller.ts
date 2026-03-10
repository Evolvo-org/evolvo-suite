import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import type { GenerateInboxIdeasRequest } from '@repo/shared';
import { generateInboxIdeasSchema } from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { InboxAgentService } from './inbox-agent.service.js';

@Controller('projects/:projectId/agents/inbox')
export class InboxAgentController {
  public constructor(
    @Inject(InboxAgentService)
    private readonly inboxAgentService: InboxAgentService,
  ) {}

  @Post('generate')
  public async generateIdeas(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(generateInboxIdeasSchema))
    body: GenerateInboxIdeasRequest,
  ) {
    const result = await this.inboxAgentService.generateIdeas(projectId, body);

    return {
      success: true as const,
      message: 'Inbox ideas generated successfully.',
      data: result,
    };
  }
}
