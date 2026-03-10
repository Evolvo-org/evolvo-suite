import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getProjectQueueLimits,
  getSystemQueueLimits,
  projectQueryKeys,
  settingsQueryKeys,
} from '@repo/api-client';

import { projectWriteCapabilities } from '../../../../../src/features/auth/lib/access-control';
import { ProjectSettingsPanel } from '../../../../../src/features/projects/components/project-settings-panel';
import { prefetchProjectPage } from '../../../../../src/lib/project-page';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const queryClient = getQueryClient();

  await prefetchProjectPage(queryClient, projectId, [
    {
      queryKey: projectQueryKeys.queueLimits(projectId),
      queryFn: () => getProjectQueueLimits(projectId),
    },
    {
      queryKey: settingsQueryKeys.systemQueueLimits(),
      queryFn: () => getSystemQueueLimits(),
    },
  ], projectWriteCapabilities);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectSettingsPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
