'use client';

import {
  deleteProject,
  expandPlanningHierarchy,
  getDevelopmentPlan,
  getProjectDetail,
  getReleaseHistory,
  getRuntimeDashboard,
  listHumanInterventions,
  listDevelopmentPlanVersions,
  projectQueryKeys,
  startProject,
  stopProject,
} from '@repo/api-client';
import { Badge } from '@repo/ui/components/badge/badge';
import { Button } from '@repo/ui/components/button/button';
import { Card } from '@repo/ui/components/card/card';
import { EmptyState } from '@repo/ui/components/empty-state/empty-state';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  QueryLoadingCard,
  QueryStateCard,
} from '../../feedback/components/query-state-card';
import {
  getErrorToastMessage,
  useToast,
} from '../../feedback/components/toast-provider';
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

const formatPlanningApprovalTimestamp = (timestamp: string | null): string | null => {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp).toLocaleString();
};

export const ProjectOverviewPanel = ({ projectId }: { projectId: string }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
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

  const expandPlanMutation = useMutation({
    mutationFn: () => expandPlanningHierarchy(projectId),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.detail(projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.planningHierarchy(projectId),
        }),
      ]);
      pushToast({
        title: 'Plan expansion queued',
        description: response.data.summary,
        variant: 'success',
      });
    },
    onError: (error) => {
      const message = getErrorToastMessage(
        error,
        'Unable to queue planning expansion.',
      );
      pushToast({
        title: 'Planning expansion failed',
        description: message,
        variant: 'error',
      });
    },
  });

  const projectLifecycleMutation = useMutation({
    mutationFn: (nextAction: 'start' | 'stop') =>
      nextAction === 'start' ? startProject(projectId) : stopProject(projectId),
    onSuccess: async (_response, nextAction) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.detail(projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.runtimeDashboard(projectId),
        }),
      ]);
      pushToast({
        title:
          nextAction === 'start' ? 'Project activated' : 'Project paused',
        description:
          nextAction === 'start'
            ? 'The runtime can now lease new work for this project.'
            : 'The runtime will stop leasing new work for this project.',
        variant: 'success',
      });
    },
    onError: (error, nextAction) => {
      const message = getErrorToastMessage(
        error,
        nextAction === 'start'
          ? 'Unable to activate the project.'
          : 'Unable to pause the project.',
      );
      pushToast({
        title:
          nextAction === 'start'
            ? 'Project activation failed'
            : 'Project pause failed',
        description: message,
        variant: 'error',
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      pushToast({
        title: 'Project deleted',
        description: `${response.data.name} was removed successfully.`,
        variant: 'success',
      });
      router.push('/projects');
    },
    onError: (error) => {
      const message = getErrorToastMessage(error, 'Unable to delete the project.');
      pushToast({
        title: 'Project deletion failed',
        description: message,
        variant: 'error',
      });
    },
  });

  if (projectQuery.isLoading) {
    return (
      <QueryLoadingCard
        title="Loading project overview"
        description="Fetching the latest durable project state from the API."
      />
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <QueryStateCard
        title="Project unavailable"
        description="The project overview could not be loaded. Confirm the API is available and the project exists."
        onRetry={() => {
          void projectQuery.refetch();
          void runtimeDashboardQuery.refetch();
          void releaseHistoryQuery.refetch();
          void interventionsQuery.refetch();
          void planQuery.refetch();
          void versionsQuery.refetch();
        }}
      />
    );
  }

  const { data: project } = projectQuery;
  const planningApproval = planQuery.data?.planningApproval;
  const approvalTimestamp = formatPlanningApprovalTimestamp(
    planningApproval?.approvedAt ?? null,
  );
  const hasApprovalDrift =
    planningApproval?.isApproved === false &&
    planningApproval?.approvedVersionId != null;
  const approvalTone = planningApproval?.isApproved
    ? 'success'
    : hasApprovalDrift
      ? 'warning'
      : 'neutral';
  const approvalLabel = planningApproval?.isApproved
    ? 'Approved for execution'
    : hasApprovalDrift
      ? 'Approval no longer matches the active plan'
      : 'Approval required';
  const canExpandPlan =
    project.productSpecVersion !== null &&
    planQuery.data?.activeVersionNumber !== null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {project.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <ProjectStatusBadge status={project.lifecycleStatus} />
          <Button
            disabled={projectLifecycleMutation.isPending || deleteProjectMutation.isPending}
            onClick={() => {
              void projectLifecycleMutation.mutateAsync(
                project.lifecycleStatus === 'active' ? 'stop' : 'start',
              );
            }}
            type="button"
          >
            {projectLifecycleMutation.isPending
              ? project.lifecycleStatus === 'active'
                ? 'Pausing project...'
                : 'Activating project...'
              : project.lifecycleStatus === 'active'
                ? 'Pause project'
                : 'Activate project'}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-500 dark:bg-red-500 dark:text-white dark:hover:bg-red-400"
            disabled={deleteProjectMutation.isPending || projectLifecycleMutation.isPending}
            onClick={() => {
              if (
                !window.confirm(
                  `Delete project "${project.name}"? This permanently removes its planning, work items, runtime history, and settings.`,
                )
              ) {
                return;
              }

              void deleteProjectMutation.mutateAsync();
            }}
            type="button"
          >
            {deleteProjectMutation.isPending ? 'Deleting project...' : 'Delete project'}
          </Button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {project.repository.owner}/{project.repository.name}
          </span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {project.lifecycleStatus === 'active'
            ? 'This project is eligible for runtime leasing.'
            : 'Draft and paused projects will not lease new work until they are activated.'}
        </p>
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
            href={`/projects/${projectId}/runtime`}
          >
            Open runtime monitor
          </Link>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/worktrees`}
          >
            Open worktrees
          </Link>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/releases`}
          >
            Open releases
          </Link>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/interventions`}
          >
            Open interventions
          </Link>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/usage`}
          >
            Open usage analytics
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
            <EmptyState
              title="No activity yet"
              description="Activity timelines arrive in the observability phase. This slot stays stable until the activity feed lands."
            />
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
          <div className="space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Runtime dashboard data could not be loaded.
            </p>
            <Button
              onClick={() => {
                void runtimeDashboardQuery.refetch();
              }}
              type="button"
            >
              Retry runtime dashboard
            </Button>
          </div>
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
          <div className="space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Release dashboard data could not be loaded.
            </p>
            <Button
              onClick={() => {
                void releaseHistoryQuery.refetch();
              }}
              type="button"
            >
              Retry release dashboard
            </Button>
          </div>
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
          <div className="space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Intervention dashboard data could not be loaded.
            </p>
            <Button
              onClick={() => {
                void interventionsQuery.refetch();
              }}
              type="button"
            >
              Retry intervention dashboard
            </Button>
          </div>
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
              <Link
                className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
                href={`/projects/${projectId}/interventions`}
              >
                Open intervention queue
              </Link>
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
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={approvalTone}>{approvalLabel}</Badge>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {planQuery.data?.activeVersionNumber
                  ? `Active version v${planQuery.data.activeVersionNumber}`
                  : 'No active plan version'}
              </p>
            </div>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {planningApproval?.isApproved
                ? `Approved by ${planningApproval.approvedBy ?? 'Unknown operator'}${approvalTimestamp ? ` on ${approvalTimestamp}` : ''}.`
                : hasApprovalDrift
                  ? 'Planning changed after approval. Re-approve the active plan version before moving work into ready for dev.'
                  : 'The active development plan version still needs operator approval before planning work can move into ready for dev.'}
            </p>
            {planningApproval?.summary ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {planningApproval.summary}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                disabled={!canExpandPlan || expandPlanMutation.isPending}
                onClick={() => {
                  void expandPlanMutation.mutateAsync();
                }}
              >
                {expandPlanMutation.isPending
                  ? 'Queueing plan expansion...'
                  : 'Start planning from active plan'}
              </Button>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {canExpandPlan
                  ? 'Queue planning work items from the active product specification and development plan.'
                  : 'Add both a product specification and an active development plan version before starting planning.'}
              </p>
            </div>
          </div>
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
