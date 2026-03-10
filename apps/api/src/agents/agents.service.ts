import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateAgentArtifactRequest,
  CreateAgentDecisionRequest,
  CreateAgentFailureRequest,
  CreateAgentRunRequest,
  AgentRunListResponse,
  AgentRunRecord,
  UpsertPromptSnapshotRequest,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';

import { mapAgentRun, mapAgentRunList } from './agents.mapper.js';

const toPrismaRunStatus = (value: CreateAgentRunRequest['status']) => {
  switch (value) {
    case 'completed':
      return 'COMPLETED' as const;
    case 'failed':
      return 'FAILED' as const;
    case 'cancelled':
      return 'CANCELLED' as const;
    default:
      return 'RUNNING' as const;
  }
};

const toPrismaArtifactType = (value: CreateAgentArtifactRequest['artifactType']) => {
  switch (value) {
    case 'log':
      return 'LOG' as const;
    case 'patch':
      return 'PATCH' as const;
    case 'report':
      return 'REPORT' as const;
    case 'plan':
      return 'PLAN' as const;
    default:
      return 'OTHER' as const;
  }
};

@Injectable()
export class AgentsService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
  ) {}

  public async createAgentRun(
    projectId: string,
    workItemId: string,
    payload: CreateAgentRunRequest,
  ): Promise<AgentRunRecord> {
    await this.projectsService.ensureProjectExists(projectId);
    await this.assertWorkItemBelongsToProject(projectId, workItemId);
    await this.assertRuntimeIfProvided(payload.runtimeId);
    await this.assertLeaseIfProvided(projectId, workItemId, payload.leaseId);

    const run = await this.prisma.agentRun.create({
      data: {
        projectId,
        workItemId,
        runtimeId: payload.runtimeId?.trim(),
        leaseId: payload.leaseId?.trim(),
        agentType: payload.agentType.trim(),
        status: toPrismaRunStatus(payload.status),
        startedAt: payload.startedAt ? new Date(payload.startedAt) : new Date(),
        completedAt: payload.completedAt ? new Date(payload.completedAt) : null,
        summary: payload.summary?.trim(),
      },
      include: this.runInclude,
    });

    return mapAgentRun(run);
  }

  public async listAgentRuns(
    projectId: string,
    workItemId: string,
  ): Promise<AgentRunListResponse> {
    await this.projectsService.ensureProjectExists(projectId);
    await this.assertWorkItemBelongsToProject(projectId, workItemId);

    const runs = await this.prisma.agentRun.findMany({
      where: { projectId, workItemId },
      orderBy: [{ createdAt: 'desc' }],
      include: this.runInclude,
    });

    return mapAgentRunList(projectId, workItemId, runs);
  }

  public async createDecision(
    projectId: string,
    workItemId: string,
    runId: string,
    payload: CreateAgentDecisionRequest,
  ): Promise<AgentRunRecord> {
    await this.assertRunBelongsToWorkItem(projectId, workItemId, runId);

    await this.prisma.agentDecision.create({
      data: {
        agentRunId: runId,
        decision: payload.decision.trim(),
        rationale: payload.rationale?.trim(),
      },
    });

    return this.getRun(projectId, workItemId, runId);
  }

  public async recordFailure(
    projectId: string,
    workItemId: string,
    runId: string,
    payload: CreateAgentFailureRequest,
  ): Promise<AgentRunRecord> {
    await this.assertRunBelongsToWorkItem(projectId, workItemId, runId);

    const existing = await this.prisma.agentFailure.findUnique({
      where: { agentRunId: runId },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Agent failure is already recorded for this run.');
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.agentFailure.create({
        data: {
          agentRunId: runId,
          errorMessage: payload.errorMessage.trim(),
          details: payload.details?.trim(),
        },
      });

      await transaction.agentRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          summary: payload.errorMessage.trim(),
        },
      });
    });

    return this.getRun(projectId, workItemId, runId);
  }

  public async upsertPromptSnapshot(
    projectId: string,
    workItemId: string,
    runId: string,
    payload: UpsertPromptSnapshotRequest,
  ): Promise<AgentRunRecord> {
    await this.assertRunBelongsToWorkItem(projectId, workItemId, runId);

    await this.prisma.promptSnapshot.upsert({
      where: { agentRunId: runId },
      create: {
        agentRunId: runId,
        systemPrompt: payload.systemPrompt?.trim(),
        userPrompt: payload.userPrompt?.trim(),
        messagesJson: payload.messagesJson?.trim(),
      },
      update: {
        systemPrompt: payload.systemPrompt?.trim() ?? null,
        userPrompt: payload.userPrompt?.trim() ?? null,
        messagesJson: payload.messagesJson?.trim() ?? null,
      },
    });

    return this.getRun(projectId, workItemId, runId);
  }

  public async createArtifact(
    projectId: string,
    workItemId: string,
    runId: string,
    payload: CreateAgentArtifactRequest,
  ): Promise<AgentRunRecord> {
    await this.assertRunBelongsToWorkItem(projectId, workItemId, runId);

    await this.prisma.agentRunArtifact.create({
      data: {
        agentRunId: runId,
        artifactType: toPrismaArtifactType(payload.artifactType),
        label: payload.label.trim(),
        content: payload.content?.trim(),
        url: payload.url?.trim(),
      },
    });

    return this.getRun(projectId, workItemId, runId);
  }

  private get runInclude() {
    return {
      promptSnapshot: true,
      decisions: {
        orderBy: { createdAt: 'asc' as const },
      },
      failure: true,
      artifacts: {
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  private async getRun(
    projectId: string,
    workItemId: string,
    runId: string,
  ): Promise<AgentRunRecord> {
    const run = await this.prisma.agentRun.findFirst({
      where: { id: runId, projectId, workItemId },
      include: this.runInclude,
    });

    if (!run) {
      throw new NotFoundException('Agent run not found.');
    }

    return mapAgentRun(run);
  }

  private async assertWorkItemBelongsToProject(
    projectId: string,
    workItemId: string,
  ): Promise<void> {
    const workItem = await this.prisma.workItem.findFirst({
      where: { id: workItemId, projectId },
      select: { id: true },
    });

    if (!workItem) {
      throw new NotFoundException('Work item not found for project.');
    }
  }

  private async assertRunBelongsToWorkItem(
    projectId: string,
    workItemId: string,
    runId: string,
  ): Promise<void> {
    const run = await this.prisma.agentRun.findFirst({
      where: { id: runId, projectId, workItemId },
      select: { id: true },
    });

    if (!run) {
      throw new NotFoundException('Agent run not found.');
    }
  }

  private async assertRuntimeIfProvided(runtimeId?: string): Promise<void> {
    if (!runtimeId) {
      return;
    }

    const runtime = await this.prisma.runtimeInstance.findUnique({
      where: { id: runtimeId.trim() },
      select: { id: true },
    });

    if (!runtime) {
      throw new NotFoundException('Runtime not found.');
    }
  }

  private async assertLeaseIfProvided(
    projectId: string,
    workItemId: string,
    leaseId?: string,
  ): Promise<void> {
    if (!leaseId) {
      return;
    }

    const lease = await this.prisma.workItemLease.findFirst({
      where: { id: leaseId.trim(), projectId, workItemId },
      select: { id: true },
    });

    if (!lease) {
      throw new ConflictException('Lease does not match the project work item.');
    }
  }
}
