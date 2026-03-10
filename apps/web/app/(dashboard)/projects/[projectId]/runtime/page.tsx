import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getProjectLogs,
  getRuntimeDashboard,
  projectQueryKeys,
} from '@repo/api-client';

import { ProjectRuntimeMonitorPanel } from '../../../../../src/features/projects/components/project-runtime-monitor-panel';
import { prefetchProjectPage } from '../../../../../src/lib/project-page';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectRuntimePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const queryClient = getQueryClient();

  await prefetchProjectPage(queryClient, projectId, [
    {
      queryKey: projectQueryKeys.runtimeDashboard(projectId),
      queryFn: () => getRuntimeDashboard(projectId),
    },
    {
      queryKey: projectQueryKeys.logs(projectId, { limit: 25 }),
      queryFn: () => getProjectLogs(projectId, { limit: 25 }),
    },
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectRuntimeMonitorPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
