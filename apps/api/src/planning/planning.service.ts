import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateAcceptanceCriterionRequest,
  CreateEpicRequest,
  CreateWorkItemRequest,
  PlanningHierarchyResponse,
  UpdateAcceptanceCriterionRequest,
  UpdateEpicRequest,
  UpdateWorkItemDependenciesRequest,
  UpdateWorkItemPriorityRequest,
  UpdateWorkItemRequest,
  WorkItemNode,
  WorkItemPriority,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';

type PrismaWorkItemKind = 'TASK' | 'SUBTASK';
type PrismaWorkItemPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

type HierarchyEpicRecord = {
  id: string;
  projectId: string;
  developmentPlanId: string | null;
  title: string;
  summary: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type HierarchyWorkItemRecord = {
  id: string;
  epicId: string;
  parentId: string | null;
  kind: PrismaWorkItemKind;
  title: string;
  description: string | null;
  priority: PrismaWorkItemPriority;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  acceptanceCriteria: Array<{
    id: string;
    text: string;
    isComplete: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  dependencies: Array<{ dependsOnWorkItemId: string }>;
};

const mapWorkItemKind = (value: PrismaWorkItemKind) =>
  value.toLowerCase() as WorkItemNode['kind'];

const mapWorkItemPriority = (value: PrismaWorkItemPriority) =>
  value.toLowerCase() as WorkItemPriority;

const toPrismaPriority = (
  value: WorkItemPriority | undefined,
): PrismaWorkItemPriority => {
  switch (value) {
    case 'low':
      return 'LOW';
    case 'high':
      return 'HIGH';
    case 'urgent':
      return 'URGENT';
    default:
      return 'MEDIUM';
  }
};

@Injectable()
export class PlanningService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
  ) {}

  public async getHierarchy(
    projectId: string,
  ): Promise<PlanningHierarchyResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const [developmentPlan, epics, workItems] = await this.prisma.$transaction([
      this.prisma.developmentPlan.findUnique({
        where: { projectId },
        select: { id: true },
      }),
      this.prisma.epic.findMany({
        where: { projectId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.workItem.findMany({
        where: { projectId },
        orderBy: [
          { epicId: 'asc' },
          { parentId: 'asc' },
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
        include: {
          acceptanceCriteria: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
          dependencies: {
            select: {
              dependsOnWorkItemId: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      }),
    ]);

    const workItemsByEpic = new Map<string, HierarchyWorkItemRecord[]>();

    for (const workItem of workItems as HierarchyWorkItemRecord[]) {
      const items = workItemsByEpic.get(workItem.epicId) ?? [];
      items.push(workItem);
      workItemsByEpic.set(workItem.epicId, items);
    }

    const hierarchyEpics = (epics as HierarchyEpicRecord[]).map((epic) => {
      const itemRecords = workItemsByEpic.get(epic.id) ?? [];
      const nodesById = new Map<string, WorkItemNode>();
      const taskRoots: WorkItemNode[] = [];

      for (const item of itemRecords) {
        nodesById.set(item.id, {
          id: item.id,
          epicId: item.epicId,
          parentId: item.parentId,
          kind: mapWorkItemKind(item.kind as PrismaWorkItemKind),
          title: item.title,
          description: item.description,
          priority: mapWorkItemPriority(
            item.priority as PrismaWorkItemPriority,
          ),
          sortOrder: item.sortOrder,
          dependencyIds: item.dependencies.map(
            (dependency) => dependency.dependsOnWorkItemId,
          ),
          acceptanceCriteria: item.acceptanceCriteria.map((criterion) => ({
            id: criterion.id,
            text: criterion.text,
            isComplete: criterion.isComplete,
            sortOrder: criterion.sortOrder,
            createdAt: criterion.createdAt.toISOString(),
            updatedAt: criterion.updatedAt.toISOString(),
          })),
          children: [],
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        });
      }

      for (const item of itemRecords) {
        const node = nodesById.get(item.id);

        if (!node) {
          continue;
        }

        if (item.parentId) {
          const parentNode = nodesById.get(item.parentId);
          parentNode?.children.push(node);
          continue;
        }

        taskRoots.push(node);
      }

      return {
        id: epic.id,
        projectId: epic.projectId,
        developmentPlanId: epic.developmentPlanId,
        title: epic.title,
        summary: epic.summary,
        sortOrder: epic.sortOrder,
        tasks: taskRoots,
        createdAt: epic.createdAt.toISOString(),
        updatedAt: epic.updatedAt.toISOString(),
      };
    });

    return {
      projectId,
      developmentPlanId: developmentPlan?.id ?? null,
      epics: hierarchyEpics,
      workItemCount: workItems.length,
      acceptanceCriteriaCount: workItems.reduce(
        (count, workItem) => count + workItem.acceptanceCriteria.length,
        0,
      ),
    };
  }

  public async createEpic(
    projectId: string,
    payload: CreateEpicRequest,
  ): Promise<PlanningHierarchyResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const developmentPlan = await this.prisma.developmentPlan.findUnique({
      where: { projectId },
      select: { id: true },
    });
    const epicCount = await this.prisma.epic.count({ where: { projectId } });

    await this.prisma.epic.create({
      data: {
        projectId,
        developmentPlanId: developmentPlan?.id ?? null,
        title: payload.title.trim(),
        summary: payload.summary?.trim(),
        sortOrder: payload.sortOrder ?? epicCount,
      },
    });

    return this.getHierarchy(projectId);
  }

  public async updateEpic(
    projectId: string,
    epicId: string,
    payload: UpdateEpicRequest,
  ): Promise<PlanningHierarchyResponse> {
    await this.getEpic(projectId, epicId);

    await this.prisma.epic.update({
      where: { id: epicId },
      data: {
        title: payload.title?.trim(),
        summary:
          payload.summary === undefined ? undefined : payload.summary?.trim() ?? null,
        sortOrder: payload.sortOrder,
      },
    });

    return this.getHierarchy(projectId);
  }

  public async deleteEpic(
    projectId: string,
    epicId: string,
  ): Promise<PlanningHierarchyResponse> {
    await this.getEpic(projectId, epicId);

    await this.prisma.epic.delete({
      where: { id: epicId },
    });

    return this.getHierarchy(projectId);
  }

  public async createWorkItem(
    projectId: string,
    payload: CreateWorkItemRequest,
  ): Promise<PlanningHierarchyResponse> {
    await this.getEpic(projectId, payload.epicId);
    await this.assertParentRelationship(
      projectId,
      payload.kind,
      payload.parentId ?? null,
      payload.epicId,
    );

    const siblingCount = await this.prisma.workItem.count({
      where: {
        projectId,
        epicId: payload.epicId,
        parentId: payload.parentId ?? null,
      },
    });

    await this.prisma.workItem.create({
      data: {
        projectId,
        epicId: payload.epicId,
        parentId: payload.parentId ?? null,
        kind: payload.kind === 'subtask' ? 'SUBTASK' : 'TASK',
        title: payload.title.trim(),
        description: payload.description?.trim(),
        priority: toPrismaPriority(payload.priority),
        sortOrder: payload.sortOrder ?? siblingCount,
      },
    });

    return this.getHierarchy(projectId);
  }

  public async updateWorkItem(
    projectId: string,
    workItemId: string,
    payload: UpdateWorkItemRequest,
  ): Promise<PlanningHierarchyResponse> {
    const existing = await this.getWorkItem(projectId, workItemId);
    const epicId = payload.epicId ?? existing.epicId;
    const parentId =
      payload.parentId === undefined ? existing.parentId : payload.parentId;

    await this.getEpic(projectId, epicId);
    await this.assertParentRelationship(
      projectId,
      mapWorkItemKind(existing.kind as PrismaWorkItemKind),
      parentId,
      epicId,
      workItemId,
    );

    await this.prisma.workItem.update({
      where: { id: workItemId },
      data: {
        epicId,
        parentId,
        title: payload.title?.trim(),
        description:
          payload.description === undefined
            ? undefined
            : payload.description?.trim() ?? null,
        priority: payload.priority
          ? toPrismaPriority(payload.priority)
          : undefined,
        sortOrder: payload.sortOrder,
      },
    });

    return this.getHierarchy(projectId);
  }

  public async deleteWorkItem(
    projectId: string,
    workItemId: string,
  ): Promise<PlanningHierarchyResponse> {
    await this.getWorkItem(projectId, workItemId);

    await this.prisma.workItem.delete({
      where: { id: workItemId },
    });

    return this.getHierarchy(projectId);
  }

  public async updateWorkItemPriority(
    projectId: string,
    workItemId: string,
    payload: UpdateWorkItemPriorityRequest,
  ): Promise<PlanningHierarchyResponse> {
    await this.getWorkItem(projectId, workItemId);

    await this.prisma.workItem.update({
      where: { id: workItemId },
      data: {
        priority: toPrismaPriority(payload.priority),
      },
    });

    return this.getHierarchy(projectId);
  }

  public async updateWorkItemDependencies(
    projectId: string,
    workItemId: string,
    payload: UpdateWorkItemDependenciesRequest,
  ): Promise<PlanningHierarchyResponse> {
    await this.getWorkItem(projectId, workItemId);
    await this.assertDependencies(projectId, workItemId, payload.dependencyIds);

    await this.prisma.workItemDependency.deleteMany({
      where: { workItemId },
    });

    if (payload.dependencyIds.length > 0) {
      await this.prisma.workItemDependency.createMany({
        data: payload.dependencyIds.map((dependencyId) => ({
          workItemId,
          dependsOnWorkItemId: dependencyId,
        })),
      });
    }

    return this.getHierarchy(projectId);
  }

  public async createAcceptanceCriterion(
    projectId: string,
    workItemId: string,
    payload: CreateAcceptanceCriterionRequest,
  ): Promise<PlanningHierarchyResponse> {
    await this.getWorkItem(projectId, workItemId);

    const criterionCount = await this.prisma.acceptanceCriterion.count({
      where: { workItemId },
    });

    await this.prisma.acceptanceCriterion.create({
      data: {
        workItemId,
        text: payload.text.trim(),
        isComplete: payload.isComplete ?? false,
        sortOrder: payload.sortOrder ?? criterionCount,
      },
    });

    return this.getHierarchy(projectId);
  }

  public async updateAcceptanceCriterion(
    projectId: string,
    criterionId: string,
    payload: UpdateAcceptanceCriterionRequest,
  ): Promise<PlanningHierarchyResponse> {
    await this.getAcceptanceCriterion(projectId, criterionId);

    await this.prisma.acceptanceCriterion.update({
      where: { id: criterionId },
      data: {
        text: payload.text?.trim(),
        isComplete: payload.isComplete,
        sortOrder: payload.sortOrder,
      },
    });

    return this.getHierarchy(projectId);
  }

  public async deleteAcceptanceCriterion(
    projectId: string,
    criterionId: string,
  ): Promise<PlanningHierarchyResponse> {
    await this.getAcceptanceCriterion(projectId, criterionId);

    await this.prisma.acceptanceCriterion.delete({
      where: { id: criterionId },
    });

    return this.getHierarchy(projectId);
  }

  private async getEpic(projectId: string, epicId: string) {
    const epic = await this.prisma.epic.findFirst({
      where: {
        id: epicId,
        projectId,
      },
    });

    if (!epic) {
      throw new NotFoundException('Epic not found.');
    }

    return epic;
  }

  private async getWorkItem(projectId: string, workItemId: string) {
    const workItem = await this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        projectId,
      },
    });

    if (!workItem) {
      throw new NotFoundException('Work item not found.');
    }

    return workItem;
  }

  private async getAcceptanceCriterion(projectId: string, criterionId: string) {
    const criterion = await this.prisma.acceptanceCriterion.findFirst({
      where: {
        id: criterionId,
        workItem: {
          projectId,
        },
      },
    });

    if (!criterion) {
      throw new NotFoundException('Acceptance criterion not found.');
    }

    return criterion;
  }

  private async assertParentRelationship(
    projectId: string,
    kind: WorkItemNode['kind'],
    parentId: string | null,
    epicId: string,
    currentWorkItemId?: string,
  ) {
    if (kind === 'task') {
      if (parentId) {
        throw new BadRequestException('Tasks cannot have a parent work item.');
      }

      return;
    }

    if (!parentId) {
      throw new BadRequestException('Subtasks must reference a parent task.');
    }

    if (parentId === currentWorkItemId) {
      throw new BadRequestException('A work item cannot be its own parent.');
    }

    const parent = await this.prisma.workItem.findFirst({
      where: {
        id: parentId,
        projectId,
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent work item not found.');
    }

    if (parent.kind !== 'TASK') {
      throw new BadRequestException('Only tasks can own subtasks.');
    }

    if (parent.parentId !== null) {
      throw new BadRequestException('Subtasks cannot own child work items.');
    }

    if (parent.epicId !== epicId) {
      throw new BadRequestException(
        'Subtasks must stay within the same epic as their parent task.',
      );
    }
  }

  private async assertDependencies(
    projectId: string,
    workItemId: string,
    dependencyIds: string[],
  ) {
    const uniqueDependencyIds = [...new Set(dependencyIds)];

    if (uniqueDependencyIds.includes(workItemId)) {
      throw new BadRequestException('A work item cannot depend on itself.');
    }

    if (uniqueDependencyIds.length === 0) {
      return;
    }

    const dependencies = await this.prisma.workItem.findMany({
      where: {
        id: { in: uniqueDependencyIds },
        projectId,
      },
      select: { id: true },
    });

    if (dependencies.length !== uniqueDependencyIds.length) {
      throw new BadRequestException(
        'Dependencies must reference work items in the same project.',
      );
    }
  }
}
