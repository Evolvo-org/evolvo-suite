import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getDevelopmentPlan,
  listHumanInterventions,
  getProductSpec,
  getReleaseHistory,
  getRuntimeDashboard,
  listDevelopmentPlanVersions,
  projectQueryKeys,
} from '@repo/api-client';

import { ProjectOverviewPanel } from '../../../../src/features/projects/components/project-overview-panel';
import { prefetchProjectPage } from '../../../../src/lib/project-page';
import { getQueryClient } from '../../../../src/lib/query-client';

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const queryClient = getQueryClient();

  await prefetchProjectPage(queryClient, projectId, [
    {
      queryKey: projectQueryKeys.runtimeDashboard(projectId),
      queryFn: () => getRuntimeDashboard(projectId),
    },
    {
      queryKey: projectQueryKeys.releases(projectId),
      queryFn: () => getReleaseHistory(projectId),
    },
    {
      queryKey: projectQueryKeys.interventions(projectId),
      queryFn: () => listHumanInterventions(projectId),
    },
    {
      queryKey: projectQueryKeys.productSpec(projectId),
      queryFn: () => getProductSpec(projectId),
    },
    {
      queryKey: projectQueryKeys.developmentPlan(projectId),
      queryFn: () => getDevelopmentPlan(projectId),
    },
    {
      queryKey: projectQueryKeys.developmentPlanVersions(projectId),
      queryFn: () => listDevelopmentPlanVersions(projectId),
    },
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectOverviewPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
