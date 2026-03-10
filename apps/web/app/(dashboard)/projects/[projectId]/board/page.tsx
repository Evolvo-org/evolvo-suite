import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getBoard, projectQueryKeys } from '@repo/api-client';

import { workflowCapabilities } from '../../../../../src/features/auth/lib/access-control';
import { KanbanBoardPanel } from '../../../../../src/features/projects/components/kanban-board-panel';
import { prefetchProjectPage } from '../../../../../src/lib/project-page';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const queryClient = getQueryClient();

  await prefetchProjectPage(queryClient, projectId, [
    {
      queryKey: projectQueryKeys.board(projectId),
      queryFn: () => getBoard(projectId),
    },
  ], workflowCapabilities);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <KanbanBoardPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
