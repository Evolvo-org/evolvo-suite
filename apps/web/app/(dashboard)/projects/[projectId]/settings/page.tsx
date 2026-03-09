import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getProjectDetail,
  getProjectQueueLimits,
  getSystemQueueLimits,
  projectQueryKeys,
  settingsQueryKeys,
} from '@repo/api-client';

import { ProjectSettingsPanel } from '../../../../../src/features/projects/components/project-settings-panel';
import { prefetchQuerySafely } from '../../../../../src/lib/prefetch-query-safely';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectSettingsPage({
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
      queryKey: projectQueryKeys.queueLimits(projectId),
      queryFn: () => getProjectQueueLimits(projectId),
    }),
    prefetchQuerySafely(queryClient, {
      queryKey: settingsQueryKeys.systemQueueLimits(),
      queryFn: () => getSystemQueueLimits(),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectSettingsPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
