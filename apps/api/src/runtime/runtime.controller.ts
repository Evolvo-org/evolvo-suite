import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import type {
  ManagementCommandCompleteRequest,
  ManagementCommandFailRequest,
  ManagementCommandProgressRequest,
  RegisterRuntimeRequest,
  RequestRuntimeWorkRequest,
  RuntimeArtifactUploadMetadataRequest,
  RuntimeHeartbeatRequest,
  RuntimeJobResultRequest,
  RuntimeProgressUpdateRequest,
} from '@repo/shared';
import {
  managementCommandCompleteSchema,
  managementCommandFailSchema,
  managementCommandProgressSchema,
  registerRuntimeSchema,
  requestRuntimeWorkSchema,
  runtimeArtifactUploadMetadataSchema,
  runtimeHeartbeatSchema,
  runtimeJobResultSchema,
  runtimeProgressUpdateSchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ManagementService } from '../management/management.service.js';

import { RuntimeService } from './runtime.service.js';

@Controller('runtimes')
export class RuntimeController {
  public constructor(
    @Inject(RuntimeService)
    private readonly runtimeService: RuntimeService,
    @Inject(ManagementService)
    private readonly managementService: ManagementService,
  ) {}

  @Post('register')
  public async registerRuntime(
    @Body(new ZodValidationPipe(registerRuntimeSchema))
    body: RegisterRuntimeRequest,
  ) {
    const runtime = await this.runtimeService.registerRuntime(body);

    return {
      success: true as const,
      message: 'Runtime registered successfully.',
      data: runtime,
    };
  }

  @Post(':runtimeId/heartbeat')
  public async recordHeartbeat(
    @Param('runtimeId') runtimeId: string,
    @Body(new ZodValidationPipe(runtimeHeartbeatSchema))
    body: RuntimeHeartbeatRequest,
  ) {
    const runtime = await this.runtimeService.recordHeartbeat(runtimeId, body);

    return {
      success: true as const,
      message: 'Runtime heartbeat recorded successfully.',
      data: runtime,
    };
  }

  @Post(':runtimeId/request-work')
  public async requestWork(
    @Param('runtimeId') runtimeId: string,
    @Body(new ZodValidationPipe(requestRuntimeWorkSchema))
    body: RequestRuntimeWorkRequest,
  ) {
    const dispatch = await this.runtimeService.requestWork(runtimeId, body);

    return {
      success: true as const,
      message: dispatch.lease
        ? 'Runtime work dispatched successfully.'
        : 'No leased work is currently available.',
      data: dispatch,
    };
  }

  @Post(':runtimeId/management-commands/claim')
  public async claimManagementCommand(@Param('runtimeId') runtimeId: string) {
    const command = await this.managementService.claimNextCommand(runtimeId);

    return {
      success: true as const,
      message: command
        ? 'Management command claimed successfully.'
        : 'No management command is currently available.',
      data: command,
    };
  }

  @Post(':runtimeId/management-commands/:commandId/progress')
  public async reportManagementCommandProgress(
    @Param('runtimeId') runtimeId: string,
    @Param('commandId') commandId: string,
    @Body(new ZodValidationPipe(managementCommandProgressSchema))
    body: ManagementCommandProgressRequest,
  ) {
    const command = await this.managementService.reportProgress(
      runtimeId,
      commandId,
      body,
    );

    return {
      success: true as const,
      message: 'Management command progress recorded successfully.',
      data: command,
    };
  }

  @Post(':runtimeId/management-commands/:commandId/complete')
  public async completeManagementCommand(
    @Param('runtimeId') runtimeId: string,
    @Param('commandId') commandId: string,
    @Body(new ZodValidationPipe(managementCommandCompleteSchema))
    body: ManagementCommandCompleteRequest,
  ) {
    const command = await this.managementService.completeCommand(
      runtimeId,
      commandId,
      body,
    );

    return {
      success: true as const,
      message: 'Management command completed successfully.',
      data: command,
    };
  }

  @Post(':runtimeId/management-commands/:commandId/fail')
  public async failManagementCommand(
    @Param('runtimeId') runtimeId: string,
    @Param('commandId') commandId: string,
    @Body(new ZodValidationPipe(managementCommandFailSchema))
    body: ManagementCommandFailRequest,
  ) {
    const command = await this.managementService.failCommand(
      runtimeId,
      commandId,
      body,
    );

    return {
      success: true as const,
      message: 'Management command failure recorded successfully.',
      data: command,
    };
  }

  @Post(':runtimeId/leases/:leaseId/progress')
  public async recordProgress(
    @Param('runtimeId') runtimeId: string,
    @Param('leaseId') leaseId: string,
    @Body(new ZodValidationPipe(runtimeProgressUpdateSchema))
    body: RuntimeProgressUpdateRequest,
  ) {
    const lease = await this.runtimeService.recordProgress(
      runtimeId,
      leaseId,
      body,
    );

    return {
      success: true as const,
      message: 'Runtime progress recorded successfully.',
      data: lease,
    };
  }

  @Post(':runtimeId/leases/:leaseId/result')
  public async recordJobResult(
    @Param('runtimeId') runtimeId: string,
    @Param('leaseId') leaseId: string,
    @Body(new ZodValidationPipe(runtimeJobResultSchema))
    body: RuntimeJobResultRequest,
  ) {
    const result = await this.runtimeService.recordJobResult(
      runtimeId,
      leaseId,
      body,
    );

    return {
      success: true as const,
      message: 'Runtime job result recorded successfully.',
      data: result,
    };
  }

  @Post(':runtimeId/leases/:leaseId/artifacts')
  public async createArtifactUploadMetadata(
    @Param('runtimeId') runtimeId: string,
    @Param('leaseId') leaseId: string,
    @Body(new ZodValidationPipe(runtimeArtifactUploadMetadataSchema))
    body: RuntimeArtifactUploadMetadataRequest,
  ) {
    const artifact = await this.runtimeService.createArtifactUploadMetadata(
      runtimeId,
      leaseId,
      body,
    );

    return {
      success: true as const,
      message: 'Runtime artifact metadata created successfully.',
      data: artifact,
    };
  }

  @Get(':runtimeId')
  public getRuntimeDetail(@Param('runtimeId') runtimeId: string) {
    return this.runtimeService.getRuntimeDetail(runtimeId);
  }
}
