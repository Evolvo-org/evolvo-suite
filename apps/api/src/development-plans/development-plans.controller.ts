import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UsePipes,
} from '@nestjs/common';
import type {
  ActivateDevelopmentPlanVersionRequest,
  ApproveDevelopmentPlanRequest,
  CreateDevelopmentPlanRequest,
  UpdateDevelopmentPlanRequest,
} from '@repo/shared';
import {
  activateDevelopmentPlanVersionSchema,
  approveDevelopmentPlanSchema,
  createDevelopmentPlanSchema,
  updateDevelopmentPlanSchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { DevelopmentPlansService } from './development-plans.service.js';

@Controller('projects/:projectId/development-plan')
export class DevelopmentPlansController {
  public constructor(
    @Inject(DevelopmentPlansService)
    private readonly developmentPlansService: DevelopmentPlansService,
  ) {}

  @Get()
  public async getDevelopmentPlan(@Param('projectId') projectId: string) {
    return this.developmentPlansService.getDevelopmentPlan(projectId);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createDevelopmentPlanSchema))
  public async createDevelopmentPlan(
    @Param('projectId') projectId: string,
    @Body() body: CreateDevelopmentPlanRequest,
  ) {
    const plan = await this.developmentPlansService.createDevelopmentPlan(
      projectId,
      body,
    );

    return {
      success: true as const,
      message: 'Development plan created successfully.',
      data: plan,
    };
  }

  @Patch()
  @UsePipes(new ZodValidationPipe(updateDevelopmentPlanSchema))
  public async updateDevelopmentPlan(
    @Param('projectId') projectId: string,
    @Body() body: UpdateDevelopmentPlanRequest,
  ) {
    const plan = await this.developmentPlansService.updateDevelopmentPlan(
      projectId,
      body,
    );

    return {
      success: true as const,
      message: 'Development plan updated successfully.',
      data: plan,
    };
  }

  @Get('versions')
  public async listPlanVersions(@Param('projectId') projectId: string) {
    return this.developmentPlansService.listPlanVersions(projectId);
  }

  @Get('approvals')
  public async listApprovalAudit(@Param('projectId') projectId: string) {
    return this.developmentPlansService.listApprovalAudit(projectId);
  }

  @Post('versions/activate')
  @UsePipes(new ZodValidationPipe(activateDevelopmentPlanVersionSchema))
  public async activateVersion(
    @Param('projectId') projectId: string,
    @Body() body: ActivateDevelopmentPlanVersionRequest,
  ) {
    const plan = await this.developmentPlansService.activateVersion(
      projectId,
      body,
    );

    return {
      success: true as const,
      message: 'Development plan version activated successfully.',
      data: plan,
    };
  }

  @Post('approve')
  @UsePipes(new ZodValidationPipe(approveDevelopmentPlanSchema))
  public async approveDevelopmentPlan(
    @Param('projectId') projectId: string,
    @Body() body: ApproveDevelopmentPlanRequest,
  ) {
    const plan = await this.developmentPlansService.approveDevelopmentPlan(
      projectId,
      body,
    );

    return {
      success: true as const,
      message: 'Development plan approved successfully.',
      data: plan,
    };
  }
}
