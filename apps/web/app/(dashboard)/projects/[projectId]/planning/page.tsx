import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getPlanningHierarchy,
  projectQueryKeys,
} from '@repo/api-client';

import { PlanningHierarchyPanel } from '../../../../../src/features/projects/components/planning-hierarchy-panel';
import { prefetchProjectPage } from '../../../../../src/lib/project-page';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function PlanningHierarchyPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const queryClient = getQueryClient();

  await prefetchProjectPage(queryClient, projectId, [
    {
      queryKey: projectQueryKeys.planningHierarchy(projectId),
      queryFn: () => getPlanningHierarchy(projectId),
    },
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PlanningHierarchyPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
