import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getPlanningHierarchy,
  getProjectDetail,
  projectQueryKeys,
} from '@repo/api-client';

import { PlanningHierarchyPanel } from '../../../../../src/features/projects/components/planning-hierarchy-panel';
import { prefetchQuerySafely } from '../../../../../src/lib/prefetch-query-safely';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function PlanningHierarchyPage({
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
      queryKey: projectQueryKeys.planningHierarchy(projectId),
      queryFn: () => getPlanningHierarchy(projectId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PlanningHierarchyPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
