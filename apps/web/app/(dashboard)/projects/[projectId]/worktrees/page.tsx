import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getProjectDetail,
  getProjectWorktrees,
  projectQueryKeys,
} from '@repo/api-client';

import { ProjectWorktreesPanel } from '../../../../../src/features/projects/components/project-worktrees-panel';
import { prefetchQuerySafely } from '../../../../../src/lib/prefetch-query-safely';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectWorktreesPage({
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
      queryKey: projectQueryKeys.worktrees(projectId),
      queryFn: () => getProjectWorktrees(projectId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectWorktreesPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
