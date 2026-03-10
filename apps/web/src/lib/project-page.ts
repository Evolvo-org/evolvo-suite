import {
  ApiClientError,
  getProjectDetail,
  projectQueryKeys,
} from '@repo/api-client';
import type {
  FetchQueryOptions,
  QueryClient,
} from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { requireCurrentUser } from '../features/auth/lib/server-auth';
import { prefetchQuerySafely } from './prefetch-query-safely';

export const isNotFoundProjectError = (error: unknown): boolean => {
  return error instanceof ApiClientError && error.statusCode === 404;
};

export const prefetchProjectPage = async (
  queryClient: QueryClient,
  projectId: string,
  additionalQueries: FetchQueryOptions[] = [],
  requiredCapabilities: readonly string[] = [],
): Promise<void> => {
  await requireCurrentUser(requiredCapabilities);

  try {
    await queryClient.fetchQuery({
      queryKey: projectQueryKeys.detail(projectId),
      queryFn: () => getProjectDetail(projectId),
    });
  } catch (error) {
    if (isNotFoundProjectError(error)) {
      notFound();
    }
  }

  await Promise.all(
    additionalQueries.map((queryOptions) =>
      prefetchQuerySafely(queryClient, queryOptions),
    ),
  );
};
