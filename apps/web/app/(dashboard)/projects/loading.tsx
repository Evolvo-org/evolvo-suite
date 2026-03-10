import { Card } from '@repo/ui/components/card/card';
import { Skeleton } from '@repo/ui/components/skeleton/skeleton';

const loadingProjectIds = [
  'loading-project-1',
  'loading-project-2',
  'loading-project-3',
  'loading-project-4',
] as const;

export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-6" title="Loading projects">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-56 max-w-full" />
        <Skeleton className="h-4 w-full max-w-3xl" />
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {loadingProjectIds.map((projectId) => (
          <Card key={projectId} className="space-y-4 p-6" title="Loading project">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-9 w-36" />
          </Card>
        ))}
      </div>
    </div>
  );
}
