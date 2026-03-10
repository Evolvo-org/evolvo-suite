import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  listHumanInterventions,
  projectQueryKeys,
} from '@repo/api-client';

import { workflowCapabilities } from '../../../../../src/features/auth/lib/access-control';
import { ProjectInterventionsPanel } from '../../../../../src/features/projects/components/project-interventions-panel';
import { prefetchProjectPage } from '../../../../../src/lib/project-page';
import { getQueryClient } from '../../../../../src/lib/query-client';

export default async function ProjectInterventionsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const queryClient = getQueryClient();

  await prefetchProjectPage(queryClient, projectId, [
    {
      queryKey: projectQueryKeys.interventions(projectId),
      queryFn: () => listHumanInterventions(projectId),
    },
  ], workflowCapabilities);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectInterventionsPanel projectId={projectId} />
    </HydrationBoundary>
  );
}
