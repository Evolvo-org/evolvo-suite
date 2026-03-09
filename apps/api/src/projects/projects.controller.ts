import {
  Body,
  Controller,
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
  CreateProjectRequest,
  ProjectListFilters,
  ProjectRepositoryInput,
  UpdateProjectRequest,
} from '@repo/shared';
import {
  createProjectSchema,
  projectListFiltersSchema,
  updateProjectRepositorySchema,
  updateProjectSchema,
  validateProjectRepositorySchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  public constructor(
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
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

  @Get(':projectId/status')
  public async getProjectStatus(@Param('projectId') projectId: string) {
    return this.projectsService.getProjectStatus(projectId);
  }
}
