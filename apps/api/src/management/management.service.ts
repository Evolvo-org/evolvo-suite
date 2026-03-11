import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ProjectRepository } from '@repo/db/client';
import type {
  ManagementCommandCompleteRequest,
  ManagementCommandFailRequest,
  ManagementCommandProgressRequest,
  ManagementCommandRecord,
  ProjectRepositoryInput,
  RepoCloneOrSyncCommandArgs,
} from '@repo/shared';

import { LogsService } from '../logs/logs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

import { mapManagementCommand } from './management.mapper.js';

const mapRepository = (repository: ProjectRepository): ProjectRepositoryInput => ({
  provider: 'github',
  owner: repository.owner,
  name: repository.name,
  url: repository.url,
  defaultBranch: repository.defaultBranch,
  baseBranch: repository.baseBranch,
});

@Injectable()
export class ManagementService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(LogsService)
    private readonly logsService: LogsService,
  ) {}

  public async enqueueRepoCloneOrSync(
    projectId: string,
    requestedBy: string,
  ): Promise<ManagementCommandRecord> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { repository: true },
    });

    if (!project || !project.repository) {
      throw new NotFoundException('Project repository configuration not found.');
    }

    const args: RepoCloneOrSyncCommandArgs = {
      projectId,
      projectSlug: project.slug,
      repository: mapRepository(project.repository),
    };
    const argsJson = args as unknown as Prisma.InputJsonValue;
    const now = new Date();

    const command = await this.prisma.$transaction(async (transaction) => {
      await transaction.project.update({
        where: { id: projectId },
        data: {
          repositorySetupStatus: 'PENDING',
          repositorySetupMessage: 'Repository setup queued.',
          repositorySetupError: null,
          repositorySetupUpdatedAt: now,
        },
      });

      return transaction.managementCommand.create({
        data: {
          projectId,
          commandType: 'REPO_CLONE_OR_SYNC',
          status: 'PENDING',
          requestedBy,
          argsJson,
          activeStage: 'queued',
          statusSummary: 'Repository setup queued.',
        },
      });
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'management',
      projectId,
      eventType: 'management.command.queued',
      message: `Queued repo.clone_or_sync for project ${projectId}.`,
      payload: {
        commandId: command.id,
        commandType: 'repo.clone_or_sync',
        requestedBy,
      },
    });

    return mapManagementCommand(command);
  }

  public async claimNextCommand(runtimeId: string): Promise<ManagementCommandRecord | null> {
    const pending = await this.prisma.managementCommand.findFirst({
      where: { status: 'PENDING' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    if (!pending) {
      return null;
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (transaction) => {
      const claimResult = await transaction.managementCommand.updateMany({
        where: {
          id: pending.id,
          status: 'PENDING',
        },
        data: {
          status: 'IN_PROGRESS',
          runtimeId,
          startedAt: now,
          activeStage: 'claimed',
          statusSummary: `Claimed by ${runtimeId}.`,
        },
      });

      if (claimResult.count === 0) {
        return null;
      }

      await transaction.project.update({
        where: { id: pending.projectId },
        data: {
          repositorySetupStatus: 'IN_PROGRESS',
          repositorySetupMessage: `Repository setup claimed by ${runtimeId}.`,
          repositorySetupError: null,
          repositorySetupUpdatedAt: now,
        },
      });

      return transaction.managementCommand.findUniqueOrThrow({
        where: { id: pending.id },
      });
    });

    if (!updated) {
      return null;
    }

    await this.logsService.writeLog({
      level: 'info',
      source: 'management',
      projectId: updated.projectId,
      runtimeId,
      eventType: 'management.command.claimed',
      message: `Runtime ${runtimeId} claimed ${updated.commandType}.`,
      payload: {
        commandId: updated.id,
        commandType: updated.commandType,
      },
    });

    return mapManagementCommand(updated);
  }

  public async reportProgress(
    runtimeId: string,
    commandId: string,
    payload: ManagementCommandProgressRequest,
  ): Promise<ManagementCommandRecord> {
    const command = await this.assertRuntimeCommand(runtimeId, commandId);
    const now = new Date();

    const updated = await this.prisma.$transaction(async (transaction) => {
      const next = await transaction.managementCommand.update({
        where: { id: commandId },
        data: {
          activeStage: payload.activeStage?.trim() ?? command.activeStage,
          statusSummary: payload.statusSummary?.trim() ?? command.statusSummary,
        },
      });

      await transaction.project.update({
        where: { id: command.projectId },
        data: {
          repositorySetupStatus: 'IN_PROGRESS',
          repositorySetupMessage:
            payload.statusSummary?.trim() ?? command.statusSummary ?? 'Repository setup in progress.',
          repositorySetupError: null,
          repositorySetupUpdatedAt: now,
        },
      });

      return next;
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'management',
      projectId: command.projectId,
      runtimeId,
      eventType: 'management.command.progress',
      message: `Runtime ${runtimeId} updated progress for ${command.commandType}.`,
      payload: {
        commandId,
        activeStage: updated.activeStage ?? null,
        statusSummary: updated.statusSummary ?? null,
      },
    });

    return mapManagementCommand(updated);
  }

  public async completeCommand(
    runtimeId: string,
    commandId: string,
    payload: ManagementCommandCompleteRequest,
  ): Promise<ManagementCommandRecord> {
    const command = await this.assertRuntimeCommand(runtimeId, commandId);
    const now = new Date();

    const updated = await this.prisma.$transaction(async (transaction) => {
      const resultJson =
        payload.result === undefined
          ? undefined
          : (payload.result as unknown as Prisma.InputJsonValue);
      const next = await transaction.managementCommand.update({
        where: { id: commandId },
        data: {
          status: 'COMPLETED',
          activeStage: 'completed',
          statusSummary:
            payload.statusSummary?.trim() ??
            command.statusSummary ??
            'Management command completed successfully.',
          resultJson,
          errorMessage: null,
          completedAt: now,
        },
      });

      await transaction.project.update({
        where: { id: command.projectId },
        data: {
          repositorySetupStatus: 'READY',
          repositorySetupMessage:
            payload.statusSummary?.trim() ?? 'Repository setup completed successfully.',
          repositorySetupError: null,
          repositorySetupUpdatedAt: now,
        },
      });

      return next;
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'management',
      projectId: command.projectId,
      runtimeId,
      eventType: 'management.command.completed',
      message: `Runtime ${runtimeId} completed ${command.commandType}.`,
      payload: {
        commandId,
        result: payload.result ?? null,
      },
    });

    return mapManagementCommand(updated);
  }

  public async failCommand(
    runtimeId: string,
    commandId: string,
    payload: ManagementCommandFailRequest,
  ): Promise<ManagementCommandRecord> {
    const command = await this.assertRuntimeCommand(runtimeId, commandId);
    const now = new Date();

    const updated = await this.prisma.$transaction(async (transaction) => {
      const next = await transaction.managementCommand.update({
        where: { id: commandId },
        data: {
          status: 'FAILED',
          activeStage: 'failed',
          statusSummary:
            payload.statusSummary?.trim() ?? 'Management command failed.',
          errorMessage: payload.errorMessage.trim(),
          completedAt: now,
        },
      });

      await transaction.project.update({
        where: { id: command.projectId },
        data: {
          repositorySetupStatus: 'FAILED',
          repositorySetupMessage:
            payload.statusSummary?.trim() ?? 'Repository setup failed.',
          repositorySetupError: payload.errorMessage.trim(),
          repositorySetupUpdatedAt: now,
        },
      });

      return next;
    });

    await this.logsService.writeLog({
      level: 'warn',
      source: 'management',
      projectId: command.projectId,
      runtimeId,
      eventType: 'management.command.failed',
      message: `Runtime ${runtimeId} failed ${command.commandType}.`,
      payload: {
        commandId,
        errorMessage: payload.errorMessage,
      },
    });

    return mapManagementCommand(updated);
  }

  private async assertRuntimeCommand(runtimeId: string, commandId: string) {
    const command = await this.prisma.managementCommand.findUnique({
      where: { id: commandId },
    });

    if (!command) {
      throw new NotFoundException('Management command not found.');
    }

    if (command.runtimeId !== runtimeId || command.status !== 'IN_PROGRESS') {
      throw new ConflictException('Management command is not owned by this runtime.');
    }

    return command;
  }
}