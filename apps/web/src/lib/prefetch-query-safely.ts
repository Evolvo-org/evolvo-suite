import type { FetchQueryOptions, QueryClient } from '@tanstack/react-query';

export const prefetchQuerySafely = async (
  queryClient: QueryClient,
  options: FetchQueryOptions,
): Promise<void> => {
  try {
    await queryClient.prefetchQuery(options);
  } catch {
    // Pages should still render and let client components surface API errors.
  }
};
