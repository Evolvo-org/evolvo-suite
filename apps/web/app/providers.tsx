'use client';

import { authQueryKeys } from '@repo/api-client';
import type { CurrentUserResponse } from '@repo/shared';
import {
  HydrationBoundary,
  QueryClientProvider,
  type DehydratedState,
} from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { ToastProvider } from '../src/features/feedback/components/toast-provider';
import {
  clearStoredAccessToken,
  configureBrowserApiClient,
  storeAccessToken,
} from '../src/features/auth/lib/browser-auth';
import { RealtimeQuerySync } from '../src/features/realtime/components/realtime-query-sync';
import { getQueryClient } from '../src/lib/query-client';

export const Providers = ({
  children,
  accessToken,
  currentUser,
  dehydratedState,
  realtimeToken,
}: {
  children: ReactNode;
  accessToken: string | null;
  currentUser: CurrentUserResponse | null;
  dehydratedState: DehydratedState;
  realtimeToken: string | null;
}) => {
  const queryClient = getQueryClient();

  useEffect(() => {
    if (accessToken) {
      storeAccessToken(accessToken);
    } else {
      clearStoredAccessToken();
    }

    configureBrowserApiClient(accessToken);

    if (currentUser) {
      queryClient.setQueryData(authQueryKeys.currentUser, currentUser);
      return;
    }

    queryClient.removeQueries({ queryKey: authQueryKeys.currentUser });
  }, [accessToken, currentUser, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <ToastProvider>
          <RealtimeQuerySync realtimeToken={realtimeToken} />
          {children}
        </ToastProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
};
