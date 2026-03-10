'use client';

import {
  getProjectDetail,
  getProjectLogs,
  getRuntimeDashboard,
  projectQueryKeys,
} from '@repo/api-client';
import { Badge } from '@repo/ui/components/badge/badge';
import { Card } from '@repo/ui/components/card/card';
import { Select } from '@repo/ui/components/select/select';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  QueryLoadingCard,
  QueryStateCard,
} from '../../feedback/components/query-state-card';

const formatHeartbeatAge = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }

  return `${Math.floor(seconds / 3600)}h ago`;
};

const formatTimestamp = (value: string): string =>
  new Date(value).toLocaleString();

const getConnectionTone = (value: 'online' | 'offline') =>
  value === 'online' ? 'success' : 'warning';

const getHealthTone = (value: 'idle' | 'busy' | 'degraded') => {
  if (value === 'degraded') {
    return 'warning';
  }

  if (value === 'busy') {
    return 'success';
  }

  return 'neutral';
};

const stringifyPayload = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
};

const runtimeRefreshIntervalMs = 5_000;

export const ProjectRuntimeMonitorPanel = ({
  projectId,
}: {
  projectId: string;
}) => {
  const [selectedRuntimeId, setSelectedRuntimeId] = useState('all');

  const projectQuery = useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => getProjectDetail(projectId),
    refetchInterval: runtimeRefreshIntervalMs,
  });
  const runtimeDashboardQuery = useQuery({
    queryKey: projectQueryKeys.runtimeDashboard(projectId),
    queryFn: () => getRuntimeDashboard(projectId),
    refetchInterval: runtimeRefreshIntervalMs,
  });

  const logFilters = useMemo(
    () =>
      selectedRuntimeId === 'all'
        ? { limit: 25 }
        : { limit: 25, runtimeId: selectedRuntimeId },
    [selectedRuntimeId],
  );

  const logsQuery = useQuery({
    queryKey: projectQueryKeys.logs(projectId, logFilters),
    queryFn: () => getProjectLogs(projectId, logFilters),
    refetchInterval: runtimeRefreshIntervalMs,
  });

  if (projectQuery.isLoading) {
    return (
      <QueryLoadingCard
        title="Loading runtime monitor"
        description="Fetching runtime health and recent activity from the API."
      />
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <QueryStateCard
        title="Runtime monitor unavailable"
        description="The runtime view could not be loaded. Confirm the API is available and the project still exists."
        onRetry={() => {
          void projectQuery.refetch();
          void runtimeDashboardQuery.refetch();
          void logsQuery.refetch();
        }}
      />
    );
  }

  const runtimes = runtimeDashboardQuery.data?.items ?? [];
  const offlineRuntimes = runtimes.filter(
    (runtime) => runtime.connectionStatus === 'offline',
  );
  const filteredRuntimeLabel =
    selectedRuntimeId === 'all'
      ? 'All runtimes'
      : runtimes.find((runtime) => runtime.runtimeId === selectedRuntimeId)
          ?.displayName ?? selectedRuntimeId;

  return (
    <div className="space-y-6" data-cy="runtime-monitor-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Runtime monitor for {projectQuery.data.name}
          </h1>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Inspect runtime heartbeats, active jobs, recent failures, and the
            latest structured logs for this project.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}`}
          >
            Back to overview
          </Link>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/board`}
          >
            Open kanban board
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
            href={`/projects/${projectId}/settings`}
          >
            Open settings
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="space-y-3 p-6" title="Fleet summary">
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">{runtimes.length} runtimes</Badge>
            <Badge tone="success">
              {runtimes.length - offlineRuntimes.length} online
            </Badge>
            <Badge tone={offlineRuntimes.length > 0 ? 'warning' : 'neutral'}>
              {offlineRuntimes.length} offline
            </Badge>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Project runtime status: {projectQuery.data.metrics.runtimeStatus}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Repository: {projectQuery.data.repository.owner}/
            {projectQuery.data.repository.name}
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Heartbeat coverage">
          {runtimes.length > 0 ? (
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {runtimes.map((runtime) => (
                <li
                  key={runtime.runtimeId}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate">{runtime.displayName}</span>
                  <span>{formatHeartbeatAge(runtime.heartbeatAgeSeconds)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No runtime has registered for this project yet.
            </p>
          )}
        </Card>

        <Card className="space-y-3 p-6" title="Active jobs">
          {runtimes.length > 0 ? (
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {runtimes.map((runtime) => (
                <li key={runtime.runtimeId}>
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">
                    {runtime.displayName}
                  </p>
                  <p>
                    {runtime.activeJobs} active job
                    {runtime.activeJobs === 1 ? '' : 's'}
                  </p>
                  <p>{runtime.activeJobSummary ?? 'Idle'}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Active job data will appear after the runtime starts polling for
              work.
            </p>
          )}
        </Card>

        <Card className="space-y-3 p-6" title="Warnings">
          {offlineRuntimes.length > 0 ? (
            <div
              className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4"
              data-cy="runtime-offline-warning"
            >
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Offline runtime detected
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                {offlineRuntimes.map((runtime) => runtime.displayName).join(', ')}{' '}
                needs operator attention.
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No offline runtime warnings are active for this project.
            </p>
          )}
        </Card>
      </div>

      <Card className="space-y-4 p-6" title="Runtime activity">
        {runtimeDashboardQuery.isLoading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Loading runtime heartbeat and health details.
          </p>
        ) : runtimeDashboardQuery.isError ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Runtime dashboard data could not be loaded.
            </p>
            <button
              className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              onClick={() => {
                void runtimeDashboardQuery.refetch();
              }}
              type="button"
            >
              Retry runtime activity
            </button>
          </div>
        ) : runtimes.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No runtime activity has been recorded for this project yet.
          </p>
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {runtimes.map((runtime) => (
              <li
                key={runtime.runtimeId}
                className="rounded-2xl border border-zinc-800/10 p-5 dark:border-white/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                      {runtime.displayName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {runtime.runtimeId}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={getConnectionTone(runtime.connectionStatus)}>
                      {runtime.connectionStatus}
                    </Badge>
                    <Badge tone={getHealthTone(runtime.reportedStatus)}>
                      {runtime.reportedStatus}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-zinc-100/80 p-4 dark:bg-zinc-950/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Heartbeat
                    </p>
                    <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                      Last seen {formatHeartbeatAge(runtime.heartbeatAgeSeconds)}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {formatTimestamp(runtime.lastSeenAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-zinc-100/80 p-4 dark:bg-zinc-950/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Active job
                    </p>
                    <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                      {runtime.activeJobs} active job
                      {runtime.activeJobs === 1 ? '' : 's'}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {runtime.activeJobSummary ?? 'Idle'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <p>
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">
                      Last action:
                    </span>{' '}
                    {runtime.lastAction ?? 'No activity recorded yet.'}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">
                      Last error:
                    </span>{' '}
                    {runtime.lastError ?? 'No runtime error recorded.'}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">
                      Capabilities:
                    </span>{' '}
                    {runtime.capabilities.length > 0
                      ? runtime.capabilities.join(', ')
                      : 'Not reported'}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Recent failures
                  </p>
                  {runtime.recentFailures.length > 0 ? (
                    <ul className="mt-3 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {runtime.recentFailures.map((failure) => (
                        <li key={failure.id}>
                          <p className="font-medium text-zinc-950 dark:text-zinc-50">
                            {failure.message ?? 'Runtime failure recorded.'}
                          </p>
                          <p className="mt-1">
                            {formatTimestamp(failure.occurredAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                      No recent runtime failures.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-4 p-6" title="Runtime log stream">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Showing the latest project log events for{' '}
              <span className="font-medium text-zinc-950 dark:text-zinc-50">
                {filteredRuntimeLabel}
              </span>
              .
            </p>
          </div>
          <label
            className="w-full max-w-xs space-y-2 text-sm font-medium"
            htmlFor="runtime-filter"
          >
            <span>Runtime filter</span>
            <Select
              id="runtime-filter"
              value={selectedRuntimeId}
              onChange={(event) => setSelectedRuntimeId(event.target.value)}
            >
              <option value="all">All runtimes</option>
              {runtimes.map((runtime) => (
                <option key={runtime.runtimeId} value={runtime.runtimeId}>
                  {runtime.displayName}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {logsQuery.isLoading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Loading recent runtime and orchestration logs.
          </p>
        ) : logsQuery.isError ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Structured logs could not be loaded for this project.
            </p>
            <button
              className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              onClick={() => {
                void logsQuery.refetch();
              }}
              type="button"
            >
              Retry logs
            </button>
          </div>
        ) : logsQuery.data && logsQuery.data.items.length > 0 ? (
          <ul
            className="space-y-3"
            data-cy="runtime-log-stream"
          >
            {logsQuery.data.items.map((log) => {
              const payload = stringifyPayload(log.payload);

              return (
                <li
                  key={log.id}
                  className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        {log.eventType}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatTimestamp(log.occurredAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={log.level === 'error' ? 'warning' : 'neutral'}>
                        {log.level}
                      </Badge>
                      <Badge tone="neutral">{log.source}</Badge>
                      {log.runtimeId ? (
                        <Badge tone="neutral">{log.runtimeId}</Badge>
                      ) : null}
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {log.message ?? 'No log message provided.'}
                  </p>

                  {payload ? (
                    <pre className="mt-3 overflow-x-auto rounded-2xl bg-zinc-100/80 p-3 text-xs text-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-300">
                      {payload}
                    </pre>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No structured logs match the current runtime filter.
          </p>
        )}
      </Card>
    </div>
  );
};
