import { Body, Controller, Get, Inject, Put } from '@nestjs/common';
import type { AgentRoutingConfig, ProjectQueueLimits } from '@repo/shared';
import {
  updateSystemAgentRoutingSchema,
  updateSystemQueueLimitsSchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { SettingsService } from './settings.service.js';

@Controller('settings')
export class SettingsController {
  public constructor(
    @Inject(SettingsService)
    private readonly settingsService: SettingsService,
  ) {}

  @Get('queue-limits/defaults')
  public getSystemQueueLimits() {
    return this.settingsService.getSystemQueueLimits();
  }

  @Put('queue-limits/defaults')
  public async updateSystemQueueLimits(
    @Body(new ZodValidationPipe(updateSystemQueueLimitsSchema))
    body: ProjectQueueLimits,
  ) {
    const settings = await this.settingsService.updateSystemQueueLimits(body);

    return {
      success: true as const,
      message: 'System queue limits updated successfully.',
      data: settings,
    };
  }

  @Get('agent-routing/defaults')
  public getSystemAgentRouting() {
    return this.settingsService.getSystemAgentRouting();
  }

  @Put('agent-routing/defaults')
  public async updateSystemAgentRouting(
    @Body(new ZodValidationPipe(updateSystemAgentRoutingSchema))
    body: AgentRoutingConfig,
  ) {
    const settings = await this.settingsService.updateSystemAgentRouting(body);

    return {
      success: true as const,
      message: 'System agent routing updated successfully.',
      data: settings,
    };
  }
}
