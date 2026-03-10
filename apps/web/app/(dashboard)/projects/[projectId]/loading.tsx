import { Card } from '@repo/ui/components/card/card';
import { Skeleton } from '@repo/ui/components/skeleton/skeleton';

const projectLoadingPanelIds = [
  'project-loading-panel-1',
  'project-loading-panel-2',
  'project-loading-panel-3',
] as const;

export default function ProjectLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-5 w-full max-w-3xl" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {projectLoadingPanelIds.map((panelId) => (
          <Card key={panelId} className="space-y-4 p-6" title="Loading panel">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ))}
      </div>
    </div>
  );
}
