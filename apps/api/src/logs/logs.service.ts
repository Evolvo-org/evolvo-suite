import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/db/client';
import type {
  StructuredLogLevel,
  StructuredLogListResponse,
  StructuredLogQuery,
  StructuredLogRecord,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';

import { mapStructuredLog, mapStructuredLogList } from './logs.mapper.js';
import { RequestContextService } from './request-context.service.js';

type WriteStructuredLogInput = {
  level?: StructuredLogLevel;
  source: string;
  projectId?: string;
  workItemId?: string;
  agentRunId?: string;
  runtimeId?: string;
  userId?: string;
  agentType?: string;
  eventType: string;
  message?: string;
  correlationId?: string | null;
  payload?: unknown;
  occurredAt?: Date;
};

const defaultLogLimit = 50;
const maxLogLimit = 200;

const toPrismaLevel = (value: StructuredLogLevel | undefined) => {
  switch (value) {
    case 'debug':
      return 'DEBUG' as const;
    case 'warn':
      return 'WARN' as const;
    case 'error':
      return 'ERROR' as const;
    default:
      return 'INFO' as const;
  }
};

@Injectable()
export class LogsService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(RequestContextService)
    private readonly requestContextService: RequestContextService,
  ) {}

  public async writeLog(input: WriteStructuredLogInput): Promise<StructuredLogRecord> {
    const item = await this.prisma.structuredLogEntry.create({
      data: {
        level: toPrismaLevel(input.level),
        source: input.source.trim(),
        projectId: input.projectId?.trim() || null,
        workItemId: input.workItemId?.trim() || null,
        agentRunId: input.agentRunId?.trim() || null,
        runtimeId: input.runtimeId?.trim() || null,
        userId: input.userId?.trim() || null,
        agentType: input.agentType?.trim() || null,
        eventType: input.eventType.trim(),
        message: input.message?.trim() || null,
        correlationId:
          input.correlationId?.trim() || this.requestContextService.getCorrelationId(),
        payload: this.normalizePayload(input.payload),
        occurredAt: input.occurredAt ?? new Date(),
      },
    });

    return mapStructuredLog(item);
  }

  public async getSystemLogs(
    filters: StructuredLogQuery,
  ): Promise<StructuredLogListResponse> {
    return this.listLogs(null, filters);
  }

  public async getProjectLogs(
    projectId: string,
    filters: StructuredLogQuery,
  ): Promise<StructuredLogListResponse> {
    const normalizedProjectId = projectId.trim();
    const project = await this.prisma.project.findUnique({
      where: { id: normalizedProjectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return this.listLogs(normalizedProjectId, filters);
  }

  private async listLogs(
    projectId: string | null,
    filters: StructuredLogQuery,
  ): Promise<StructuredLogListResponse> {
    const normalizedFilters = this.normalizeFilters(filters);
    const where = this.buildWhere(projectId, normalizedFilters);
    const [totalCount, items] = await Promise.all([
      this.prisma.structuredLogEntry.count({ where }),
      this.prisma.structuredLogEntry.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        take: normalizedFilters.limit ?? defaultLogLimit,
      }),
    ]);

    return mapStructuredLogList({
      projectId,
      totalCount,
      items: items.map(mapStructuredLog),
      filters: normalizedFilters,
    });
  }

  private buildWhere(
    projectId: string | null,
    filters: StructuredLogQuery,
  ): Prisma.StructuredLogEntryWhereInput {
    const range = this.parseRange(filters.from, filters.to);

    return {
      ...(projectId ? { projectId } : {}),
      ...(filters.level ? { level: toPrismaLevel(filters.level) } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.eventType ? { eventType: filters.eventType } : {}),
      ...(filters.correlationId ? { correlationId: filters.correlationId } : {}),
      ...(filters.workItemId ? { workItemId: filters.workItemId } : {}),
      ...(filters.agentRunId ? { agentRunId: filters.agentRunId } : {}),
      ...(filters.runtimeId ? { runtimeId: filters.runtimeId } : {}),
      ...(range ? { occurredAt: range } : {}),
    };
  }

  private normalizeFilters(filters: StructuredLogQuery): StructuredLogQuery {
    const limit = filters.limit ?? defaultLogLimit;

    if (!Number.isInteger(limit) || limit < 1 || limit > maxLogLimit) {
      throw new ConflictException('Invalid log limit filter.');
    }

    return {
      ...(filters.level ? { level: filters.level } : {}),
      ...(filters.source ? { source: filters.source.trim() } : {}),
      ...(filters.eventType ? { eventType: filters.eventType.trim() } : {}),
      ...(filters.correlationId
        ? { correlationId: filters.correlationId.trim() }
        : {}),
      ...(filters.workItemId ? { workItemId: filters.workItemId.trim() } : {}),
      ...(filters.agentRunId ? { agentRunId: filters.agentRunId.trim() } : {}),
      ...(filters.runtimeId ? { runtimeId: filters.runtimeId.trim() } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
      limit,
    };
  }

  private parseRange(from?: string, to?: string) {
    const gte = from ? new Date(from) : undefined;
    const lte = to ? new Date(to) : undefined;

    if ((gte && Number.isNaN(gte.getTime())) || (lte && Number.isNaN(lte.getTime()))) {
      throw new ConflictException('Invalid log range filter.');
    }

    if (!gte && !lte) {
      return undefined;
    }

    return {
      ...(gte ? { gte } : {}),
      ...(lte ? { lte } : {}),
    };
  }

  private normalizePayload(payload: unknown): Prisma.InputJsonValue | undefined {
    if (payload === undefined) {
      return undefined;
    }

    if (payload === null) {
      return undefined;
    }

    try {
      return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
    } catch {
      return {
        serializationError: 'Structured log payload could not be serialized.',
      } satisfies Prisma.InputJsonObject;
    }
  }
}