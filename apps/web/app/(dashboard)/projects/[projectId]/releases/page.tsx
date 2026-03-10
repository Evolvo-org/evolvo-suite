import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getProjectDetail,
  getReleaseHistory,
  projectQueryKeys,
} from '@repo/api-client';

import { ProjectReleaseHistoryPanel } from '../../../../../src/features/projects/components/project-release-history-panel';
import { prefetchQuerySafely } from '../../../../../src/lib/prefetch-query-safely';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectReleasesPage({
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
      queryKey: projectQueryKeys.releases(projectId),
      queryFn: () => getReleaseHistory(projectId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectReleaseHistoryPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
