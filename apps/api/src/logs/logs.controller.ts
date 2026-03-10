import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import type { StructuredLogQuery } from '@repo/shared';
import { structuredLogQuerySchema } from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { LogsService } from './logs.service.js';

@Controller()
export class LogsController {
  public constructor(
    @Inject(LogsService)
    private readonly logsService: LogsService,
  ) {}

  @Get('logs/system')
  public getSystemLogs(
    @Query(new ZodValidationPipe(structuredLogQuerySchema))
    query: StructuredLogQuery,
  ) {
    return this.logsService.getSystemLogs(query);
  }

  @Get('projects/:projectId/logs')
  public getProjectLogs(
    @Param('projectId') projectId: string,
    @Query(new ZodValidationPipe(structuredLogQuerySchema))
    query: StructuredLogQuery,
  ) {
    return this.logsService.getProjectLogs(projectId, query);
  }
}