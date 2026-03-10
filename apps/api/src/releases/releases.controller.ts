import { Body, Controller, Get, Inject, Param, Post, Put } from '@nestjs/common';
import type {
  CreateReleaseRunRequest,
  CreateReleaseVersionRequest,
  RecordReleaseResultRequest,
  UpsertReleaseNoteRequest,
} from '@repo/shared';
import {
  createReleaseRunSchema,
  createReleaseVersionSchema,
  recordReleaseResultSchema,
  upsertReleaseNoteSchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { ReleasesService } from './releases.service.js';

@Controller('projects/:projectId')
export class ReleasesController {
  public constructor(
    @Inject(ReleasesService)
    private readonly releasesService: ReleasesService,
  ) {}

  @Post('work-items/:workItemId/releases')
  public async startRelease(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body(new ZodValidationPipe(createReleaseRunSchema))
    body: CreateReleaseRunRequest,
  ) {
    const releaseRun = await this.releasesService.startRelease(
      projectId,
      workItemId,
      body,
    );

    return {
      success: true as const,
      message: 'Release run started successfully.',
      data: releaseRun,
    };
  }

  @Post('work-items/:workItemId/releases/:releaseRunId/result')
  public async recordResult(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Param('releaseRunId') releaseRunId: string,
    @Body(new ZodValidationPipe(recordReleaseResultSchema))
    body: RecordReleaseResultRequest,
  ) {
    const releaseRun = await this.releasesService.recordResult(
      projectId,
      workItemId,
      releaseRunId,
      body,
    );

    return {
      success: true as const,
      message: 'Release result recorded successfully.',
      data: releaseRun,
    };
  }

  @Post('work-items/:workItemId/releases/:releaseRunId/version')
  public async createVersion(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Param('releaseRunId') releaseRunId: string,
    @Body(new ZodValidationPipe(createReleaseVersionSchema))
    body: CreateReleaseVersionRequest,
  ) {
    const releaseRun = await this.releasesService.createVersion(
      projectId,
      workItemId,
      releaseRunId,
      body,
    );

    return {
      success: true as const,
      message: 'Release version recorded successfully.',
      data: releaseRun,
    };
  }

  @Put('work-items/:workItemId/releases/:releaseRunId/notes')
  public async upsertNote(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Param('releaseRunId') releaseRunId: string,
    @Body(new ZodValidationPipe(upsertReleaseNoteSchema))
    body: UpsertReleaseNoteRequest,
  ) {
    const releaseRun = await this.releasesService.upsertNote(
      projectId,
      workItemId,
      releaseRunId,
      body,
    );

    return {
      success: true as const,
      message: 'Release notes saved successfully.',
      data: releaseRun,
    };
  }

  @Get('releases')
  public getHistory(@Param('projectId') projectId: string) {
    return this.releasesService.getHistory(projectId);
  }
}
