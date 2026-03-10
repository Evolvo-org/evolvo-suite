import type {
  DevelopmentPlan,
  DevelopmentPlanApprovalAudit,
  PlanVersion,
} from '@repo/db/client';
import type {
  DevelopmentPlanApprovalAuditResponse,
  DevelopmentPlanResponse,
  DevelopmentPlanVersionsResponse,
  PlanningApprovalStatus,
} from '@repo/shared';

export const mapPlanningApproval = (
  developmentPlan:
    | (DevelopmentPlan & {
        activeVersion: PlanVersion | null;
        versions: PlanVersion[];
      })
    | null,
): PlanningApprovalStatus => ({
  approvedAt: developmentPlan?.planningApprovedAt?.toISOString() ?? null,
  approvedBy: developmentPlan?.planningApprovedBy ?? null,
  approvedVersionId: developmentPlan?.planningApprovedVersionId ?? null,
  summary: developmentPlan?.planningApprovalSummary ?? null,
  isApproved:
    Boolean(developmentPlan?.planningApprovedAt) &&
    developmentPlan?.planningApprovedVersionId != null &&
    developmentPlan.planningApprovedVersionId === developmentPlan.activeVersionId,
});

export const mapDevelopmentPlan = (
  projectId: string,
  developmentPlan:
    | (DevelopmentPlan & {
        activeVersion: PlanVersion | null;
        versions: PlanVersion[];
      })
    | null,
): DevelopmentPlanResponse => ({
  projectId,
  planId: developmentPlan?.id ?? null,
  title: developmentPlan?.title ?? null,
  activeVersionId: developmentPlan?.activeVersionId ?? null,
  activeVersionNumber: developmentPlan?.activeVersion?.versionNumber ?? null,
  activeContent: developmentPlan?.activeVersion?.content ?? null,
  versionCount: developmentPlan?.versions.length ?? 0,
  planningApproval: mapPlanningApproval(developmentPlan),
  updatedAt: developmentPlan?.updatedAt.toISOString() ?? null,
});

export const mapDevelopmentPlanVersions = (
  projectId: string,
  developmentPlan:
    | (DevelopmentPlan & {
        activeVersion: PlanVersion | null;
        versions: PlanVersion[];
      })
    | null,
): DevelopmentPlanVersionsResponse => ({
  projectId,
  planId: developmentPlan?.id ?? null,
  activeVersionId: developmentPlan?.activeVersionId ?? null,
  planningApproval: mapPlanningApproval(developmentPlan),
  versions:
    developmentPlan?.versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      title: version.title,
      summary: version.summary,
      createdAt: version.createdAt.toISOString(),
      isActive: version.id === developmentPlan.activeVersionId,
    })) ?? [],
});

export const mapDevelopmentPlanApprovalAudit = (
  projectId: string,
  developmentPlanId: string | null,
  items: Array<
    DevelopmentPlanApprovalAudit & {
      planVersion: PlanVersion | null;
    }
  >,
): DevelopmentPlanApprovalAuditResponse => ({
  projectId,
  planId: developmentPlanId,
  items: items.map((item) => ({
    id: item.id,
    planVersionId: item.planVersionId,
    planVersionNumber: item.planVersion?.versionNumber ?? null,
    actorName: item.actorName,
    summary: item.summary ?? null,
    action: item.action === 'RESET' ? 'reset' : 'approved',
    createdAt: item.createdAt.toISOString(),
  })),
});
