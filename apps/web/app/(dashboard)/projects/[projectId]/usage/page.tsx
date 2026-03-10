import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getProjectDetail,
  getProjectUsageSummary,
  projectQueryKeys,
} from '@repo/api-client';

import { ProjectUsageAnalyticsPanel } from '../../../../../src/features/projects/components/project-usage-analytics-panel';
import { prefetchQuerySafely } from '../../../../../src/lib/prefetch-query-safely';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectUsagePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const queryClient = getQueryClient();

  await Promise.all([
    prefetchQuerySafely(queryClient, {
      queryKey: projectQueryKeys.detail(projectId),
      queryFn: () => getProjectDetail(projectId),
    }),
    prefetchQuerySafely(queryClient, {
      queryKey: projectQueryKeys.usageSummary(projectId),
      queryFn: () => getProjectUsageSummary(projectId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectUsageAnalyticsPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
