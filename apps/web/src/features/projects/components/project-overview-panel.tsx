'use client';

import {
  getDevelopmentPlan,
  getProjectDetail,
  listDevelopmentPlanVersions,
  projectQueryKeys,
} from '@repo/api-client';
import { Card } from '@repo/ui/components/card/card';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { ProjectStatusBadge } from './project-status-badge';
import { ProductSpecEditor } from './product-spec-editor';

export const ProjectOverviewPanel = ({ projectId }: { projectId: string }) => {
  const projectQuery = useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => getProjectDetail(projectId),
  });

  const planQuery = useQuery({
    queryKey: projectQueryKeys.developmentPlan(projectId),
    queryFn: () => getDevelopmentPlan(projectId),
  });

  const versionsQuery = useQuery({
    queryKey: projectQueryKeys.developmentPlanVersions(projectId),
    queryFn: () => listDevelopmentPlanVersions(projectId),
  });

  if (projectQuery.isLoading) {
    return (
      <Card className="p-6" title="Loading project overview">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Fetching the latest durable project state from the API.
        </p>
      </Card>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <Card className="p-6" title="Project unavailable">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The project overview could not be loaded. Confirm the API is available
          and the project exists.
        </p>
      </Card>
    );
  }

  const { data: project } = projectQuery;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {project.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <ProjectStatusBadge status={project.lifecycleStatus} />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {project.repository.owner}/{project.repository.name}
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-3 p-6" title="Status summary">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Runtime status: {project.metrics.runtimeStatus}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Product spec version:{' '}
            {project.productSpecVersion ?? 'not stored yet'}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Active plan version:{' '}
            {project.activePlanVersionNumber ?? 'not stored yet'}
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Queue counts">
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Inbox: {project.metrics.kanbanCounts.inbox}</li>
            <li>Planning: {project.metrics.kanbanCounts.planning}</li>
            <li>Ready for dev: {project.metrics.kanbanCounts.readyForDev}</li>
            <li>In dev: {project.metrics.kanbanCounts.inDev}</li>
            <li>
              Ready for review: {project.metrics.kanbanCounts.readyForReview}
            </li>
            <li>In review: {project.metrics.kanbanCounts.inReview}</li>
            <li>
              Ready for release: {project.metrics.kanbanCounts.readyForRelease}
            </li>
          </ul>
        </Card>

        <Card className="space-y-3 p-6" title="Latest activity">
          {project.metrics.latestActivity.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Activity timelines arrive in the observability phase. This slice
              keeps the slot stable now.
            </p>
          ) : (
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {project.metrics.latestActivity.map((activity) => (
                <li key={activity}>{activity}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-3 p-6" title="Product specification">
          <ProductSpecEditor projectId={projectId} />
        </Card>

        <Card className="space-y-3 p-6" title="Development plan">
          {planQuery.data?.activeContent ? (
            <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
              {planQuery.data.activeContent}
            </p>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No development plan stored yet.
            </p>
          )}
          <div className="rounded-xl border border-zinc-800/10 p-4 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Version history
            </p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {versionsQuery.data?.versions.length ? (
                versionsQuery.data.versions.map((version) => (
                  <li key={version.id}>
                    v{version.versionNumber} — {version.title}
                    {version.isActive ? ' (active)' : ''}
                  </li>
                ))
              ) : (
                <li>No saved plan versions yet.</li>
              )}
            </ul>
          </div>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/development-plan`}
          >
            Open development plan editor
          </Link>
        </Card>
      </div>
    </div>
  );
};
