import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import type { RunProjectAutomationRequest } from '@repo/shared';
import { runProjectAutomationSchema } from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { AutomationService } from './automation.service.js';

@Controller('projects/:projectId/automation')
export class AutomationController {
  public constructor(
    @Inject(AutomationService)
    private readonly automationService: AutomationService,
  ) {}

  @Post('run')
  public async runProjectAutomation(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(runProjectAutomationSchema))
    body: RunProjectAutomationRequest,
  ) {
    const result = await this.automationService.runProjectAutomation(projectId, body);

    return {
      success: true as const,
      message: 'Project automation executed successfully.',
      data: result,
    };
  }
}
