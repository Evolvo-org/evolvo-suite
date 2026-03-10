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
  Query,
  UsePipes,
} from '@nestjs/common';
import type {
  AgentRoutingConfig,
  CreateProjectRequest,
  ProjectListFilters,
  ProjectQueueLimits,
  ProjectRepositoryInput,
  UpdateProjectRequest,
} from '@repo/shared';
import {
  createProjectSchema,
  projectListFiltersSchema,
  updateProjectAgentRoutingSchema,
  updateProjectQueueLimitsSchema,
  updateProjectRepositorySchema,
  updateProjectSchema,
  validateProjectRepositorySchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { AutomationService } from '../automation/automation.service.js';

import { ProjectsService } from './projects.service.js';

@Controller('projects')
export class ProjectsController {
  public constructor(
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(AutomationService)
    private readonly automationService: AutomationService,
  ) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createProjectSchema))
  public async createProject(@Body() body: CreateProjectRequest) {
    const project = await this.projectsService.createProject(body);

    return {
      success: true as const,
      message: 'Project created successfully.',
      data: project,
    };
  }

  @Get()
  public async listProjects(
    @Query(new ZodValidationPipe(projectListFiltersSchema))
    query: ProjectListFilters,
  ) {
    return this.projectsService.listProjects(query);
  }

  @Post('repository/validate')
  @UsePipes(new ZodValidationPipe(validateProjectRepositorySchema))
  public validateRepository(@Body() body: ProjectRepositoryInput) {
    return this.projectsService.validateRepositoryConfig(body);
  }

  @Get(':projectId')
  public async getProjectDetail(@Param('projectId') projectId: string) {
    return this.projectsService.getProjectDetail(projectId);
  }

  @Get(':projectId/runtime-dashboard')
  public getRuntimeDashboard(@Param('projectId') projectId: string) {
    return this.projectsService.getRuntimeDashboard(projectId);
  }

  @Get(':projectId/observability/metrics')
  public getObservabilityMetrics(@Param('projectId') projectId: string) {
    return this.projectsService.getObservabilityMetrics(projectId);
  }

  @Get(':projectId/repository')
  public async getRepository(@Param('projectId') projectId: string) {
    return this.projectsService.getRepositoryConfig(projectId);
  }

  @Put(':projectId/repository')
  @UsePipes(new ZodValidationPipe(updateProjectRepositorySchema))
  public async updateRepository(
    @Param('projectId') projectId: string,
    @Body() body: ProjectRepositoryInput,
  ) {
    const repository = await this.projectsService.upsertRepositoryConfig(
      projectId,
      body,
    );

    return {
      success: true as const,
      message: 'Project repository configuration saved successfully.',
      data: repository,
    };
  }

  @Get(':projectId/queue-limits')
  public async getProjectQueueLimits(@Param('projectId') projectId: string) {
    return this.projectsService.getProjectQueueLimits(projectId);
  }

  @Put(':projectId/queue-limits')
  public async updateProjectQueueLimits(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(updateProjectQueueLimitsSchema))
    body: ProjectQueueLimits,
  ) {
    const queueLimits = await this.projectsService.upsertProjectQueueLimits(
      projectId,
      body,
    );

    return {
      success: true as const,
      message: 'Project queue limits updated successfully.',
      data: queueLimits,
    };
  }

  @Delete(':projectId/queue-limits')
  public async clearProjectQueueLimits(@Param('projectId') projectId: string) {
    const queueLimits = await this.projectsService.clearProjectQueueLimits(
      projectId,
    );

    return {
      success: true as const,
      message: 'Project queue limits reset to system defaults.',
      data: queueLimits,
    };
  }

  @Get(':projectId/agent-routing')
  public async getProjectAgentRouting(@Param('projectId') projectId: string) {
    return this.projectsService.getProjectAgentRouting(projectId);
  }

  @Put(':projectId/agent-routing')
  public async updateProjectAgentRouting(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(updateProjectAgentRoutingSchema))
    body: AgentRoutingConfig,
  ) {
    const routing = await this.projectsService.upsertProjectAgentRouting(
      projectId,
      body,
    );

    return {
      success: true as const,
      message: 'Project agent routing updated successfully.',
      data: routing,
    };
  }

  @Delete(':projectId/agent-routing')
  public async clearProjectAgentRouting(@Param('projectId') projectId: string) {
    const routing = await this.projectsService.clearProjectAgentRouting(projectId);

    return {
      success: true as const,
      message: 'Project agent routing reset to system defaults.',
      data: routing,
    };
  }

  @Get(':projectId/agent-routing/:agentType/resolve')
  public async resolveProjectAgentRoute(
    @Param('projectId') projectId: string,
    @Param('agentType') agentType: 'planning' | 'dev' | 'review' | 'release',
  ) {
    return this.projectsService.resolveProjectAgentRoute(projectId, agentType);
  }

  @Patch(':projectId')
  @UsePipes(new ZodValidationPipe(updateProjectSchema))
  public async updateProject(
    @Param('projectId') projectId: string,
    @Body() body: UpdateProjectRequest,
  ) {
    const project = await this.projectsService.updateProject(projectId, body);

    return {
      success: true as const,
      message: 'Project updated successfully.',
      data: project,
    };
  }

  @Post(':projectId/start')
  public async startProject(@Param('projectId') projectId: string) {
    const status = await this.projectsService.startProject(projectId);
    await this.automationService.runProjectAutomation(projectId, {
      maxActions: 5,
    });

    return {
      success: true as const,
      message: 'Project started successfully.',
      data: status,
    };
  }

  @Post(':projectId/stop')
  public async stopProject(@Param('projectId') projectId: string) {
    const status = await this.projectsService.stopProject(projectId);

    return {
      success: true as const,
      message: 'Project stopped successfully.',
      data: status,
    };
  }

  @Delete(':projectId')
  public async deleteProject(@Param('projectId') projectId: string) {
    const deletedProject = await this.projectsService.deleteProject(projectId);

    return {
      success: true as const,
      message: 'Project deleted successfully.',
      data: deletedProject,
    };
  }

  @Get(':projectId/status')
  public async getProjectStatus(@Param('projectId') projectId: string) {
    return this.projectsService.getProjectStatus(projectId);
  }
}
