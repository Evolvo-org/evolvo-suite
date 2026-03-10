import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getProjectUsageSummary,
  getRuntimeDashboard,
  listHumanInterventions,
  listProjects,
  projectQueryKeys,
} from '@repo/api-client';

import { requireCurrentUser } from '../../../src/features/auth/lib/server-auth';
import { DashboardPanel } from '../../../src/features/dashboard/components/dashboard-panel';
import { createDashboardUsageFilters } from '../../../src/features/dashboard/lib/dashboard-metrics';
import { prefetchQuerySafely } from '../../../src/lib/prefetch-query-safely';
import { getQueryClient } from '../../../src/lib/query-client';

export default async function DashboardPage() {
  await requireCurrentUser();

  const queryClient = getQueryClient();
  const usageFilters = createDashboardUsageFilters();
  const projects = await queryClient.fetchQuery({
    queryFn: () => listProjects(),
    queryKey: projectQueryKeys.list(),
  });

  await Promise.all(
    projects.items.flatMap((project) => [
      prefetchQuerySafely(queryClient, {
        queryFn: () => getRuntimeDashboard(project.id),
        queryKey: projectQueryKeys.runtimeDashboard(project.id),
      }),
      prefetchQuerySafely(queryClient, {
        queryFn: () => listHumanInterventions(project.id),
        queryKey: projectQueryKeys.interventions(project.id),
      }),
      prefetchQuerySafely(queryClient, {
        queryFn: () => getProjectUsageSummary(project.id, usageFilters),
        queryKey: projectQueryKeys.usageSummary(project.id, usageFilters),
      }),
    ]),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardPanel usageFilters={usageFilters} />
    </HydrationBoundary>
  );
}
