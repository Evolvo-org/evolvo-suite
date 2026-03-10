import { Card } from '@repo/ui/components/card/card';
import { Skeleton } from '@repo/ui/components/skeleton/skeleton';

const loadingPanelIds = [
  'loading-panel-1',
  'loading-panel-2',
  'loading-panel-3',
  'loading-panel-4',
  'loading-panel-5',
  'loading-panel-6',
] as const;

export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Card className="space-y-4 p-6" title="Loading Evolvo v2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-80 max-w-full" />
          <Skeleton className="h-4 w-full max-w-3xl" />
        </Card>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {loadingPanelIds.map((panelId) => (
            <Card key={panelId} className="space-y-4 p-6" title="Loading panel">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
