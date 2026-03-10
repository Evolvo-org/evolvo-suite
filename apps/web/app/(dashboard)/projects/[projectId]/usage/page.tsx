import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getProjectUsageSummary,
  projectQueryKeys,
} from '@repo/api-client';

import { usageReadCapabilities } from '../../../../../src/features/auth/lib/access-control';
import { ProjectUsageAnalyticsPanel } from '../../../../../src/features/projects/components/project-usage-analytics-panel';
import { prefetchProjectPage } from '../../../../../src/lib/project-page';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectUsagePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const queryClient = getQueryClient();

  await prefetchProjectPage(queryClient, projectId, [
    {
      queryKey: projectQueryKeys.usageSummary(projectId),
      queryFn: () => getProjectUsageSummary(projectId),
    },
  ], usageReadCapabilities);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectUsageAnalyticsPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
