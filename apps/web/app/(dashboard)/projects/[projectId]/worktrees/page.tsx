import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getProjectWorktrees,
  projectQueryKeys,
} from '@repo/api-client';

import { ProjectWorktreesPanel } from '../../../../../src/features/projects/components/project-worktrees-panel';
import { prefetchProjectPage } from '../../../../../src/lib/project-page';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectWorktreesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const queryClient = getQueryClient();

  await prefetchProjectPage(queryClient, projectId, [
    {
      queryKey: projectQueryKeys.worktrees(projectId),
      queryFn: () => getProjectWorktrees(projectId),
    },
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectWorktreesPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
