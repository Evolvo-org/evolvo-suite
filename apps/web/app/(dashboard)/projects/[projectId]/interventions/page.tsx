import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getProjectDetail,
  listHumanInterventions,
  projectQueryKeys,
} from '@repo/api-client';

import { ProjectInterventionsPanel } from '../../../../../src/features/projects/components/project-interventions-panel';
import { prefetchQuerySafely } from '../../../../../src/lib/prefetch-query-safely';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectInterventionsPage({
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
      queryKey: projectQueryKeys.interventions(projectId),
      queryFn: () => listHumanInterventions(projectId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectInterventionsPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
