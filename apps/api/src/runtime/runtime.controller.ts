import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import type {
  RegisterRuntimeRequest,
  RuntimeHeartbeatRequest,
} from '@repo/shared';
import {
  registerRuntimeSchema,
  runtimeHeartbeatSchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { RuntimeService } from './runtime.service.js';

@Controller('runtimes')
export class RuntimeController {
  public constructor(
    @Inject(RuntimeService)
    private readonly runtimeService: RuntimeService,
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

  @Get(':runtimeId')
  public getRuntimeDetail(@Param('runtimeId') runtimeId: string) {
    return this.runtimeService.getRuntimeDetail(runtimeId);
  }
}
