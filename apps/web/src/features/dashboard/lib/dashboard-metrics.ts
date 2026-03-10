import type {
  HumanInterventionListResponse,
  ProjectListItem,
  RuntimeDashboardResponse,
  UsageSummaryResponse,
} from '@repo/shared';

export interface DashboardUsageFilters {
  from: string;
  to: string;
}

export interface DashboardMetrics {
  interventions: {
    affectedProjects: number;
    oldestOpenSummary: string | null;
    openCases: number;
    resolvedCases: number;
  };
  projects: {
    active: number;
    draft: number;
    paused: number;
    runtimeAlertProjects: number;
    total: number;
  };
  runtime: {
    activeJobs: number;
    busiestProjectName: string | null;
    degradedRuntimes: number;
    offlineRuntimes: number;
    onlineRuntimes: number;
    totalRuntimes: number;
  };
  usage: {
    topProjectCostUsd: number;
    topProjectName: string | null;
    topProviderModel: string | null;
    totalCostUsd: number;
    totalEvents: number;
    totalTokens: number;
  };
}

const formatDate = (value: Date): string => value.toISOString().slice(0, 10);

export const createDashboardUsageFilters = (
  referenceDate: Date = new Date(),
): DashboardUsageFilters => {
  const endDate = new Date(referenceDate);
  const startDate = new Date(referenceDate);
  startDate.setDate(startDate.getDate() - 6);

  return {
    from: formatDate(startDate),
    to: formatDate(endDate),
  };
};

export const getDashboardUsageRangeLabel = (
  filters: DashboardUsageFilters,
): string => `${filters.from} to ${filters.to}`;

export const buildDashboardMetrics = ({
  interventionLists,
  projects,
  runtimeDashboards,
  usageSummaries,
}: {
  interventionLists: HumanInterventionListResponse[];
  projects: ProjectListItem[];
  runtimeDashboards: RuntimeDashboardResponse[];
  usageSummaries: UsageSummaryResponse[];
}): DashboardMetrics => {
  const runtimeTotalsByProject = new Map<string, number>();
  const runtimeAlertProjects = new Set<string>();
  const providerModelTotals = new Map<string, number>();
  const openCases = interventionLists.flatMap((response) =>
    response.items.filter((item) => item.status === 'open'),
  );
  const resolvedCases = interventionLists.flatMap((response) =>
    response.items.filter((item) => item.status === 'resolved'),
  );

  const runtimes = runtimeDashboards.flatMap((response) => {
    const activeJobCount = response.items.reduce(
      (total, item) => total + item.activeJobs,
      0,
    );

    runtimeTotalsByProject.set(response.projectId, activeJobCount);

    if (
      response.items.some(
        (item) =>
          item.connectionStatus === 'offline' || item.reportedStatus === 'degraded',
      )
    ) {
      runtimeAlertProjects.add(response.projectId);
    }

    return response.items;
  });

  for (const summary of usageSummaries) {
    for (const breakdown of summary.byProviderModel) {
      providerModelTotals.set(
        breakdown.key,
        (providerModelTotals.get(breakdown.key) ?? 0) + breakdown.estimatedCostUsd,
      );
    }
  }

  const oldestOpenCase = [...openCases].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )[0] ?? null;
  const topProjectUsage = [...usageSummaries].sort(
    (left, right) => right.estimatedCostUsd - left.estimatedCostUsd,
  )[0] ?? null;
  const busiestProjectId = [...runtimeTotalsByProject.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0]?.[0] ?? null;
  const topProviderModel = [...providerModelTotals.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0]?.[0] ?? null;

  return {
    interventions: {
      affectedProjects: new Set(openCases.map((item) => item.projectId)).size,
      oldestOpenSummary: oldestOpenCase?.summary ?? null,
      openCases: openCases.length,
      resolvedCases: resolvedCases.length,
    },
    projects: {
      active: projects.filter((project) => project.lifecycleStatus === 'active').length,
      draft: projects.filter((project) => project.lifecycleStatus === 'draft').length,
      paused: projects.filter((project) => project.lifecycleStatus === 'paused').length,
      runtimeAlertProjects: runtimeAlertProjects.size,
      total: projects.length,
    },
    runtime: {
      activeJobs: runtimes.reduce((total, item) => total + item.activeJobs, 0),
      busiestProjectName:
        projects.find((project) => project.id === busiestProjectId)?.name ?? null,
      degradedRuntimes: runtimes.filter(
        (item) => item.reportedStatus === 'degraded',
      ).length,
      offlineRuntimes: runtimes.filter(
        (item) => item.connectionStatus === 'offline',
      ).length,
      onlineRuntimes: runtimes.filter(
        (item) => item.connectionStatus === 'online',
      ).length,
      totalRuntimes: runtimes.length,
    },
    usage: {
      topProjectCostUsd: topProjectUsage?.estimatedCostUsd ?? 0,
      topProjectName:
        projects.find((project) => project.id === topProjectUsage?.projectId)?.name ??
        null,
      topProviderModel,
      totalCostUsd: usageSummaries.reduce(
        (total, item) => total + item.estimatedCostUsd,
        0,
      ),
      totalEvents: usageSummaries.reduce(
        (total, item) => total + item.totalEvents,
        0,
      ),
      totalTokens: usageSummaries.reduce(
        (total, item) => total + item.totalTokens,
        0,
      ),
    },
  };
};
