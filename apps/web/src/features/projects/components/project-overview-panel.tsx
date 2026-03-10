'use client';

import {
  getDevelopmentPlan,
  getProjectDetail,
  getReleaseHistory,
  getRuntimeDashboard,
  listHumanInterventions,
  listDevelopmentPlanVersions,
  projectQueryKeys,
} from '@repo/api-client';
import { Card } from '@repo/ui/components/card/card';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { ProjectStatusBadge } from './project-status-badge';
import { ProductSpecEditor } from './product-spec-editor';

const formatHeartbeatAge = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }

  return `${Math.floor(seconds / 3600)}h ago`;
};

const formatRelativeAge = (timestamp: string): string => {
  const ageSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000),
  );

  return formatHeartbeatAge(ageSeconds);
};

const categorizeInterventionReason = (summary: string, reason: string): string => {
  const combined = `${summary} ${reason}`.toLowerCase();

  if (combined.includes('missing config') || combined.includes('missing secret')) {
    return 'missingConfig';
  }

  if (combined.includes('merge conflict')) {
    return 'mergeConflict';
  }

  if (combined.includes('review')) {
    return 'review';
  }

  if (combined.includes('ambigu')) {
    return 'ambiguity';
  }

  if (combined.includes('runtime')) {
    return 'runtime';
  }

  return 'other';
};

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

  const runtimeDashboardQuery = useQuery({
    queryKey: projectQueryKeys.runtimeDashboard(projectId),
    queryFn: () => getRuntimeDashboard(projectId),
  });

  const releaseHistoryQuery = useQuery({
    queryKey: projectQueryKeys.releases(projectId),
    queryFn: () => getReleaseHistory(projectId),
  });

  const interventionsQuery = useQuery({
    queryKey: projectQueryKeys.interventions(projectId),
    queryFn: () => listHumanInterventions(projectId),
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
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/board`}
          >
            Open kanban board
          </Link>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/settings`}
          >
            Open settings
          </Link>
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

      <Card className="space-y-4 p-6" title="Runtime dashboard">
        {runtimeDashboardQuery.isLoading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Loading runtime health, heartbeat, and recent failure data.
          </p>
        ) : runtimeDashboardQuery.isError ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Runtime dashboard data could not be loaded.
          </p>
        ) : runtimeDashboardQuery.data?.items.length ? (
          <ul className="grid gap-3 xl:grid-cols-2">
            {runtimeDashboardQuery.data.items.map((runtime) => (
              <li
                key={runtime.runtimeId}
                className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      {runtime.displayName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {runtime.runtimeId}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{runtime.connectionStatus}</span>
                    <span>{runtime.reportedStatus}</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <p>Heartbeat: {formatHeartbeatAge(runtime.heartbeatAgeSeconds)}</p>
                  <p>Active jobs: {runtime.activeJobs}</p>
                  <p>Last action: {runtime.lastAction ?? 'No activity recorded yet.'}</p>
                  <p>Current job: {runtime.activeJobSummary ?? 'Idle'}</p>
                </div>

                <div className="mt-3 rounded-xl bg-zinc-100/80 p-3 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                  <p className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                    Recent failures
                  </p>
                  {runtime.recentFailures.length ? (
                    <ul className="mt-2 space-y-2">
                      {runtime.recentFailures.map((failure) => (
                        <li key={failure.id}>
                          <p>{failure.message ?? 'Runtime failure recorded.'}</p>
                          <p>{new Date(failure.occurredAt).toLocaleString()}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2">No recent failures.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No runtime activity has been recorded for this project yet.
          </p>
        )}
      </Card>

      <Card className="space-y-4 p-6" title="Release dashboard">
        {releaseHistoryQuery.isLoading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Loading release history and latest tag information.
          </p>
        ) : releaseHistoryQuery.isError ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Release dashboard data could not be loaded.
          </p>
        ) : (() => {
          const releases = releaseHistoryQuery.data?.items ?? [];
          const latestTaggedRelease = releases.find((item) => item.version?.tagName);
          const failedReleases = releases.filter((item) => item.status === 'failed');
          const interventionReleases = releases.filter(
            (item) => item.status === 'failed' || item.status === 'cancelled',
          );

          return releases.length ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Release history
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                    {releases.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Latest tag
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    {latestTaggedRelease?.version?.tagName ?? 'No tag recorded yet'}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Failed releases
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                    {failedReleases.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Intervention triggers
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                    {interventionReleases.length}
                  </p>
                </div>
              </div>

              <ul className="space-y-3">
                {releases.slice(0, 5).map((release) => (
                  <li
                    key={release.id}
                    className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          {release.workItemTitle}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {release.version?.tagName ?? 'No tag'}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {release.status}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {release.summary ?? release.errorMessage ?? 'No release summary recorded.'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Started {new Date(release.startedAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No release activity has been recorded for this project yet.
            </p>
          );
        })()}
      </Card>

      <Card className="space-y-4 p-6" title="Intervention dashboard">
        {interventionsQuery.isLoading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Loading intervention queue and retry state.
          </p>
        ) : interventionsQuery.isError ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Intervention dashboard data could not be loaded.
          </p>
        ) : (() => {
          const interventions = interventionsQuery.data?.items ?? [];
          const openInterventions = interventions.filter((item) => item.status === 'open');
          const agingInterventions = [...openInterventions]
            .sort(
              (left, right) =>
                new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
            )
            .slice(0, 5);
          const reasonCategories = openInterventions.reduce<Record<string, number>>(
            (counts, item) => {
              const category = categorizeInterventionReason(item.summary, item.reason);
              counts[category] = (counts[category] ?? 0) + 1;
              return counts;
            },
            {},
          );

          return interventions.length ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Open interventions
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                    {openInterventions.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Aging interventions
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                    {agingInterventions.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Reason categories
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                    {Object.keys(reasonCategories).length}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Retry available
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                    {openInterventions.length}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Aging queue
                  </p>
                  {agingInterventions.length ? (
                    <ul className="mt-3 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {agingInterventions.map((item) => (
                        <li key={item.id}>
                          <p className="font-medium text-zinc-950 dark:text-zinc-50">
                            {item.workItemTitle}
                          </p>
                          <p>{item.summary}</p>
                          <p>Open for {formatRelativeAge(item.createdAt)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                      No open intervention cases.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Reason categories
                  </p>
                  {Object.keys(reasonCategories).length ? (
                    <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {Object.entries(reasonCategories).map(([category, count]) => (
                        <li key={category}>
                          {category}: {count}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                      No open intervention categories.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No intervention cases have been recorded for this project yet.
            </p>
          );
        })()}
      </Card>

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
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/planning`}
          >
            Open planning hierarchy
          </Link>
        </Card>
      </div>
    </div>
  );
};
