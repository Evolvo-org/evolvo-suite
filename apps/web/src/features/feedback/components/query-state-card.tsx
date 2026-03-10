'use client';

import { Button } from '@repo/ui/components/button/button';
import { Card } from '@repo/ui/components/card/card';
import { EmptyState } from '@repo/ui/components/empty-state/empty-state';
import { Skeleton } from '@repo/ui/components/skeleton/skeleton';
import React, { type JSX, type ReactNode } from 'react';

export const QueryStateCard = ({
  action,
  children,
  description,
  onRetry,
  retryLabel = 'Try again',
  title,
}: {
  action?: ReactNode;
  children?: ReactNode;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  title: string;
}): JSX.Element => {
  return (
    <Card className="space-y-4 p-6" title={title}>
      {children ?? null}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      <div className="flex flex-wrap items-center gap-3">
        {onRetry ? (
          <Button onClick={onRetry} type="button">
            {retryLabel}
          </Button>
        ) : null}
        {action}
      </div>
    </Card>
  );
};

export const QueryLoadingCard = ({
  description,
  title,
}: {
  description: string;
  title: string;
}): JSX.Element => {
  return (
    <QueryStateCard description={description} title={title}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </QueryStateCard>
  );
};

export const QueryEmptyCard = ({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}): JSX.Element => {
  return (
    <Card className="p-6" title={title}>
      <EmptyState action={action} description={description} title={title} />
    </Card>
  );
};
