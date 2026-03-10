import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getProjectDetail,
  getProjectLogs,
  getRuntimeDashboard,
  projectQueryKeys,
} from '@repo/api-client';

import { ProjectRuntimeMonitorPanel } from '../../../../../src/features/projects/components/project-runtime-monitor-panel';
import { prefetchQuerySafely } from '../../../../../src/lib/prefetch-query-safely';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectRuntimePage({
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
      queryKey: projectQueryKeys.runtimeDashboard(projectId),
      queryFn: () => getRuntimeDashboard(projectId),
    }),
    prefetchQuerySafely(queryClient, {
      queryKey: projectQueryKeys.logs(projectId, { limit: 25 }),
      queryFn: () => getProjectLogs(projectId, { limit: 25 }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectRuntimeMonitorPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
