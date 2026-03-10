import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getReleaseHistory,
  projectQueryKeys,
} from '@repo/api-client';

import { ProjectReleaseHistoryPanel } from '../../../../../src/features/projects/components/project-release-history-panel';
import { prefetchProjectPage } from '../../../../../src/lib/project-page';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectReleasesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const queryClient = getQueryClient();

  await prefetchProjectPage(queryClient, projectId, [
    {
      queryKey: projectQueryKeys.releases(projectId),
      queryFn: () => getReleaseHistory(projectId),
    },
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectReleaseHistoryPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
