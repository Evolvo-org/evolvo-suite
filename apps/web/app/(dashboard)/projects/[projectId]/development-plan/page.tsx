import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getDevelopmentPlan,
  getProductSpec,
  listDevelopmentPlanVersions,
  projectQueryKeys,
} from '@repo/api-client';

import { DevelopmentPlanEditorPanel } from '../../../../../src/features/projects/components/development-plan-editor-panel';
import { prefetchProjectPage } from '../../../../../src/lib/project-page';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function DevelopmentPlanEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const queryClient = getQueryClient();

  await prefetchProjectPage(queryClient, projectId, [
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
      <DevelopmentPlanEditorPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
