import { Body, Controller, Get, Inject, Param, Post, Put } from '@nestjs/common';
import type {
  CreateAgentArtifactRequest,
  CreateAgentDecisionRequest,
  CreateAgentFailureRequest,
  CreateAgentRunRequest,
  UpsertPromptSnapshotRequest,
} from '@repo/shared';
import {
  createAgentArtifactSchema,
  createAgentDecisionSchema,
  createAgentFailureSchema,
  createAgentRunSchema,
  upsertPromptSnapshotSchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { AgentsService } from './agents.service.js';

@Controller('projects/:projectId/work-items/:workItemId/agent-runs')
export class AgentsController {
  public constructor(
    @Inject(AgentsService)
    private readonly agentsService: AgentsService,
  ) {}

  @Post()
  public async createRun(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(createAgentRunSchema))
    body: CreateAgentRunRequest,
  ) {
    const run = await this.agentsService.createAgentRun(projectId, workItemId, body);

    return {
      success: true as const,
      message: 'Agent run created successfully.',
      data: run,
    };
  }

  @Get()
  public listRuns(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
  ) {
    return this.agentsService.listAgentRuns(projectId, workItemId);
  }

  @Post(':runId/decisions')
  public async createDecision(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Param('runId') runId: string,
    @Body(new ZodValidationPipe(createAgentDecisionSchema))
    body: CreateAgentDecisionRequest,
  ) {
    const run = await this.agentsService.createDecision(
      projectId,
      workItemId,
      runId,
      body,
    );

    return {
      success: true as const,
      message: 'Agent decision recorded successfully.',
      data: run,
    };
  }

  @Post(':runId/failure')
  public async createFailure(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Param('runId') runId: string,
    @Body(new ZodValidationPipe(createAgentFailureSchema))
    body: CreateAgentFailureRequest,
  ) {
    const run = await this.agentsService.recordFailure(
      projectId,
      workItemId,
      runId,
      body,
    );

    return {
      success: true as const,
      message: 'Agent failure recorded successfully.',
      data: run,
    };
  }

  @Put(':runId/prompt-snapshot')
  public async upsertPromptSnapshot(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Param('runId') runId: string,
    @Body(new ZodValidationPipe(upsertPromptSnapshotSchema))
    body: UpsertPromptSnapshotRequest,
  ) {
    const run = await this.agentsService.upsertPromptSnapshot(
      projectId,
      workItemId,
      runId,
      body,
    );

    return {
      success: true as const,
      message: 'Prompt snapshot saved successfully.',
      data: run,
    };
  }

  @Post(':runId/artifacts')
  public async createArtifact(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Param('runId') runId: string,
    @Body(new ZodValidationPipe(createAgentArtifactSchema))
    body: CreateAgentArtifactRequest,
  ) {
    const run = await this.agentsService.createArtifact(
      projectId,
      workItemId,
      runId,
      body,
    );

    return {
      success: true as const,
      message: 'Agent artifact recorded successfully.',
      data: run,
    };
  }
}
