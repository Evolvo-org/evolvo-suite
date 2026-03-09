import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getBoard, getProjectDetail, projectQueryKeys } from '@repo/api-client';

import { KanbanBoardPanel } from '../../../../../src/features/projects/components/kanban-board-panel';
import { prefetchQuerySafely } from '../../../../../src/lib/prefetch-query-safely';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectBoardPage({
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
      queryKey: projectQueryKeys.board(projectId),
      queryFn: () => getBoard(projectId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <KanbanBoardPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
