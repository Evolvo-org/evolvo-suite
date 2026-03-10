'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { RealtimeQuerySync } from '../src/features/realtime/components/realtime-query-sync';
import { getQueryClient } from '../src/lib/query-client';

export const Providers = ({
  children,
  realtimeToken,
}: {
  children: ReactNode;
  realtimeToken: string | null;
}) => {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeQuerySync realtimeToken={realtimeToken} />
      {children}
    </QueryClientProvider>
  );
};
