import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  RegisterRuntimeRequest,
  RuntimeDetailResponse,
  RuntimeHeartbeatRequest,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';

import { mapRuntimeDetail } from './runtime.mapper.js';

const toPrismaStatus = (value: RuntimeHeartbeatRequest['status']) => {
  switch (value) {
    case 'busy':
      return 'BUSY' as const;
    case 'degraded':
      return 'DEGRADED' as const;
    default:
      return 'IDLE' as const;
  }
};

@Injectable()
export class RuntimeService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  public async registerRuntime(
    payload: RegisterRuntimeRequest,
  ): Promise<RuntimeDetailResponse> {
    const runtime = await this.prisma.runtimeInstance.upsert({
      where: { id: payload.runtimeId.trim() },
      create: {
        id: payload.runtimeId.trim(),
        displayName: payload.displayName.trim(),
        capabilities: payload.capabilities?.map((value) => value.trim()) ?? [],
        lastSeenAt: new Date(),
      },
      update: {
        displayName: payload.displayName.trim(),
        capabilities: payload.capabilities?.map((value) => value.trim()) ?? [],
        status: 'IDLE',
        lastSeenAt: new Date(),
      },
    });

    return mapRuntimeDetail(runtime);
  }

  public async recordHeartbeat(
    runtimeId: string,
    payload: RuntimeHeartbeatRequest,
  ): Promise<RuntimeDetailResponse> {
    await this.assertRuntimeExists(runtimeId);

    const runtime = await this.prisma.runtimeInstance.update({
      where: { id: runtimeId },
      data: {
        status: toPrismaStatus(payload.status),
        activeJobSummary: payload.activeJobSummary?.trim() ?? null,
        lastAction: payload.lastAction?.trim() ?? null,
        lastError: payload.lastError?.trim() ?? null,
        lastSeenAt: new Date(),
      },
    });

    return mapRuntimeDetail(runtime);
  }

  public async getRuntimeDetail(runtimeId: string): Promise<RuntimeDetailResponse> {
    const runtime = await this.prisma.runtimeInstance.findUnique({
      where: { id: runtimeId },
    });

    if (!runtime) {
      throw new NotFoundException('Runtime not found.');
    }

    return mapRuntimeDetail(runtime);
  }

  private async assertRuntimeExists(runtimeId: string): Promise<void> {
    const runtime = await this.prisma.runtimeInstance.findUnique({
      where: { id: runtimeId },
      select: { id: true },
    });

    if (!runtime) {
      throw new NotFoundException('Runtime not found.');
    }
  }
}
