import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import type { CreateUsageEventRequest } from '@repo/shared';
import { createUsageEventSchema } from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { UsageService } from './usage.service.js';

@Controller()
export class UsageController {
  public constructor(
    @Inject(UsageService)
    private readonly usageService: UsageService,
  ) {}

  @Post('projects/:projectId/usage/events')
  public async createUsageEvent(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createUsageEventSchema))
    body: CreateUsageEventRequest,
  ) {
    const event = await this.usageService.createUsageEvent(projectId, body);

    return {
      success: true as const,
      message: 'Usage event recorded successfully.',
      data: event,
    };
  }

  @Get('projects/:projectId/usage/summary')
  public getProjectSummary(
    @Param('projectId') projectId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.usageService.getProjectUsageSummary(projectId, from, to);
  }

  @Get('usage/users/:userId/summary')
  public getUserSummary(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.usageService.getUserUsageSummary(userId, from, to);
  }
}
