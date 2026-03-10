import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import type {
  CreateHumanInterventionRequest,
  ResolveHumanInterventionRequest,
  RetryHumanInterventionRequest,
} from '@repo/shared';
import {
  createHumanInterventionSchema,
  resolveHumanInterventionSchema,
  retryHumanInterventionSchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { InterventionsService } from './interventions.service.js';

@Controller('projects/:projectId')
export class InterventionsController {
  public constructor(
    @Inject(InterventionsService)
    private readonly interventionsService: InterventionsService,
  ) {}

  @Post('work-items/:workItemId/interventions')
  public async create(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(createHumanInterventionSchema))
    body: CreateHumanInterventionRequest,
  ) {
    const intervention = await this.interventionsService.create(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Human intervention case created successfully.',
      data: intervention,
    };
  }

  @Get('interventions')
  public list(@Param('projectId') projectId: string) {
    return this.interventionsService.list(projectId);
  }

  @Post('interventions/:interventionId/resolve')
  public async resolve(
    @Param('projectId') projectId: string,
    @Param('interventionId') interventionId: string,
    @Body(new ZodValidationPipe(resolveHumanInterventionSchema))
    body: ResolveHumanInterventionRequest,
  ) {
    const intervention = await this.interventionsService.resolve(
      projectId,
      interventionId,
      body,
    );

    return {
      success: true as const,
      message: 'Human intervention case resolved successfully.',
      data: intervention,
    };
  }

  @Post('interventions/:interventionId/retry')
  public async retry(
    @Param('projectId') projectId: string,
    @Param('interventionId') interventionId: string,
    @Body(new ZodValidationPipe(retryHumanInterventionSchema))
    body: RetryHumanInterventionRequest,
  ) {
    const intervention = await this.interventionsService.retry(
      projectId,
      interventionId,
      body,
    );

    return {
      success: true as const,
      message: 'Human intervention retry handled successfully.',
      data: intervention,
    };
  }
}
