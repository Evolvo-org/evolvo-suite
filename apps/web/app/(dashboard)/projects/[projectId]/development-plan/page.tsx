import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getDevelopmentPlan,
  getProductSpec,
  getProjectDetail,
  listDevelopmentPlanVersions,
  projectQueryKeys,
} from '@repo/api-client';

import { DevelopmentPlanEditorPanel } from '../../../../../src/features/projects/components/development-plan-editor-panel';
import { prefetchQuerySafely } from '../../../../../src/lib/prefetch-query-safely';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function DevelopmentPlanEditorPage({
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
      queryKey: projectQueryKeys.productSpec(projectId),
      queryFn: () => getProductSpec(projectId),
    }),
    prefetchQuerySafely(queryClient, {
      queryKey: projectQueryKeys.developmentPlan(projectId),
      queryFn: () => getDevelopmentPlan(projectId),
    }),
    prefetchQuerySafely(queryClient, {
      queryKey: projectQueryKeys.developmentPlanVersions(projectId),
      queryFn: () => listDevelopmentPlanVersions(projectId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DevelopmentPlanEditorPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
