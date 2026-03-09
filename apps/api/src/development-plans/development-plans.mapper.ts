import type { DevelopmentPlan, PlanVersion } from '@repo/db';
import type {
  DevelopmentPlanResponse,
  DevelopmentPlanVersionsResponse,
} from '@repo/shared';

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
