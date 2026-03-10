import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import type {
  CreateAcceptanceCriterionRequest,
  CreateEpicRequest,
  CreateWorkItemRequest,
  UpdateAcceptanceCriterionRequest,
  UpdateEpicRequest,
  UpdateWorkItemDependenciesRequest,
  UpdateWorkItemPriorityRequest,
  UpdateWorkItemRequest,
} from '@repo/shared';
import {
  createAcceptanceCriterionSchema,
  createEpicSchema,
  createWorkItemSchema,
  updateAcceptanceCriterionSchema,
  updateEpicSchema,
  updateWorkItemDependenciesSchema,
  updateWorkItemPrioritySchema,
  updateWorkItemSchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { PlanningService } from './planning.service.js';

@Controller('projects/:projectId/planning')
export class PlanningController {
  public constructor(
    @Inject(PlanningService)
    private readonly planningService: PlanningService,
  ) {}

  @Get('hierarchy')
  public getHierarchy(@Param('projectId') projectId: string) {
    return this.planningService.getHierarchy(projectId);
  }

  @Post('expand')
  public async expandPlan(@Param('projectId') projectId: string) {
    const result = await this.planningService.expandPlan(projectId);

    return {
      success: true as const,
      message: 'Planning expansion queued successfully.',
      data: result,
    };
  }

  @Post('epics')
  public async createEpic(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createEpicSchema)) body: CreateEpicRequest,
  ) {
    const hierarchy = await this.planningService.createEpic(projectId, body);

    return {
      success: true as const,
      message: 'Epic created successfully.',
      data: hierarchy,
    };
  }

  @Patch('epics/:epicId')
  public async updateEpic(
    @Param('projectId') projectId: string,
    @Param('epicId') epicId: string,
    @Body(new ZodValidationPipe(updateEpicSchema)) body: UpdateEpicRequest,
  ) {
    const hierarchy = await this.planningService.updateEpic(
      projectId,
      epicId,
      body,
    );

    return {
      success: true as const,
      message: 'Epic updated successfully.',
      data: hierarchy,
    };
  }

  @Delete('epics/:epicId')
  public async deleteEpic(
    @Param('projectId') projectId: string,
    @Param('epicId') epicId: string,
  ) {
    const hierarchy = await this.planningService.deleteEpic(projectId, epicId);

    return {
      success: true as const,
      message: 'Epic deleted successfully.',
      data: hierarchy,
    };
  }

  @Post('work-items')
  public async createWorkItem(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createWorkItemSchema)) body: CreateWorkItemRequest,
  ) {
    const hierarchy = await this.planningService.createWorkItem(projectId, body);

    return {
      success: true as const,
      message: 'Work item created successfully.',
      data: hierarchy,
    };
  }

  @Patch('work-items/:workItemId')
  public async updateWorkItem(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(updateWorkItemSchema)) body: UpdateWorkItemRequest,
  ) {
    const hierarchy = await this.planningService.updateWorkItem(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Work item updated successfully.',
      data: hierarchy,
    };
  }

  @Delete('work-items/:workItemId')
  public async deleteWorkItem(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
  ) {
    const hierarchy = await this.planningService.deleteWorkItem(
      projectId,
      workItemId,
    );

    return {
      success: true as const,
      message: 'Work item deleted successfully.',
      data: hierarchy,
    };
  }

  @Put('work-items/:workItemId/priority')
  public async updateWorkItemPriority(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(updateWorkItemPrioritySchema))
    body: UpdateWorkItemPriorityRequest,
  ) {
    const hierarchy = await this.planningService.updateWorkItemPriority(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Work item priority updated successfully.',
      data: hierarchy,
    };
  }

  @Put('work-items/:workItemId/dependencies')
  public async updateWorkItemDependencies(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(updateWorkItemDependenciesSchema))
    body: UpdateWorkItemDependenciesRequest,
  ) {
    const hierarchy = await this.planningService.updateWorkItemDependencies(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Work item dependencies updated successfully.',
      data: hierarchy,
    };
  }

  @Post('work-items/:workItemId/acceptance-criteria')
  public async createAcceptanceCriterion(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(createAcceptanceCriterionSchema))
    body: CreateAcceptanceCriterionRequest,
  ) {
    const hierarchy = await this.planningService.createAcceptanceCriterion(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Acceptance criterion created successfully.',
      data: hierarchy,
    };
  }

  @Patch('acceptance-criteria/:criterionId')
  public async updateAcceptanceCriterion(
    @Param('projectId') projectId: string,
    @Param('criterionId') criterionId: string,
    @Body(new ZodValidationPipe(updateAcceptanceCriterionSchema))
    body: UpdateAcceptanceCriterionRequest,
  ) {
    const hierarchy = await this.planningService.updateAcceptanceCriterion(
      projectId,
      criterionId,
      body,
    );

    return {
      success: true as const,
      message: 'Acceptance criterion updated successfully.',
      data: hierarchy,
    };
  }

  @Delete('acceptance-criteria/:criterionId')
  public async deleteAcceptanceCriterion(
    @Param('projectId') projectId: string,
    @Param('criterionId') criterionId: string,
  ) {
    const hierarchy = await this.planningService.deleteAcceptanceCriterion(
      projectId,
      criterionId,
    );

    return {
      success: true as const,
      message: 'Acceptance criterion deleted successfully.',
      data: hierarchy,
    };
  }
}
