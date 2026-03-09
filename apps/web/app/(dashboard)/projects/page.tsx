import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { listProjects, projectQueryKeys } from '@repo/api-client';

import { ProjectListPanel } from '../../../src/features/projects/components/project-list-panel';
import { prefetchQuerySafely } from '../../../src/lib/prefetch-query-safely';
import { getQueryClient } from '../../../src/lib/query-client';

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.query?.trim() ?? '';
  const queryClient = getQueryClient();

  await prefetchQuerySafely(queryClient, {
    queryKey: projectQueryKeys.list(query ? { query } : undefined),
    queryFn: () => listProjects(query ? { query } : undefined),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectListPanel query={query} />
    </HydrationBoundary>
  );
}
