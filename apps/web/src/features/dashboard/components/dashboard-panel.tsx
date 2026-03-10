'use client';

import {
  getProjectUsageSummary,
  getRuntimeDashboard,
  listHumanInterventions,
  listProjects,
  projectQueryKeys,
} from '@repo/api-client';
import { Badge } from '@repo/ui/components/badge/badge';
import { Card } from '@repo/ui/components/card/card';
import { useQueries, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import React, { useMemo } from 'react';

import {
  QueryLoadingCard,
  QueryStateCard,
} from '../../feedback/components/query-state-card';
import {
  buildDashboardMetrics,
  getDashboardUsageRangeLabel,
  type DashboardUsageFilters,
} from '../lib/dashboard-metrics';

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-GB', {
    currency: 'USD',
    maximumFractionDigits: value > 0 && value < 1 ? 4 : 2,
    minimumFractionDigits: value > 0 && value < 1 ? 4 : 2,
    style: 'currency',
  }).format(value);

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('en-GB').format(value);

export const DashboardPanel = ({
  usageFilters,
}: {
  usageFilters: DashboardUsageFilters;
}) => {
  const projectsQuery = useQuery({
    queryFn: () => listProjects(),
    queryKey: projectQueryKeys.list(),
  });

  const projects = projectsQuery.data?.items ?? [];

  const runtimeQueries = useQueries({
    queries: projects.map((project) => ({
      queryFn: () => getRuntimeDashboard(project.id),
      queryKey: projectQueryKeys.runtimeDashboard(project.id),
    })),
  });
  const interventionQueries = useQueries({
    queries: projects.map((project) => ({
      queryFn: () => listHumanInterventions(project.id),
      queryKey: projectQueryKeys.interventions(project.id),
    })),
  });
  const usageQueries = useQueries({
    queries: projects.map((project) => ({
      queryFn: () => getProjectUsageSummary(project.id, usageFilters),
      queryKey: projectQueryKeys.usageSummary(project.id, usageFilters),
    })),
  });

  const isSummaryLoading =
    projectsQuery.isLoading ||
    runtimeQueries.some((query) => query.isLoading) ||
    interventionQueries.some((query) => query.isLoading) ||
    usageQueries.some((query) => query.isLoading);
  const hasSummaryError =
    projectsQuery.isError ||
    runtimeQueries.some((query) => query.isError) ||
    interventionQueries.some((query) => query.isError) ||
    usageQueries.some((query) => query.isError);

  const metrics = useMemo(() => {
    return buildDashboardMetrics({
      interventionLists: interventionQueries
        .map((query) => query.data)
        .filter((value) => value !== undefined),
      projects,
      runtimeDashboards: runtimeQueries
        .map((query) => query.data)
        .filter((value) => value !== undefined),
      usageSummaries: usageQueries
        .map((query) => query.data)
        .filter((value) => value !== undefined),
    });
  }, [interventionQueries, projects, runtimeQueries, usageQueries]);

  if (isSummaryLoading) {
    return (
      <QueryLoadingCard
        title="Loading dashboard"
        description="Aggregating project health, runtime status, intervention queue pressure, and recent usage."
      />
    );
  }

  if (hasSummaryError || !projectsQuery.data) {
    return (
      <QueryStateCard
        description="The dashboard summary could not be loaded. Confirm the API is available and the session is still valid."
        onRetry={() => {
          void projectsQuery.refetch();

          for (const query of runtimeQueries) {
            void query.refetch();
          }

          for (const query of interventionQueries) {
            void query.refetch();
          }

          for (const query of usageQueries) {
            void query.refetch();
          }
        }}
        title="Dashboard unavailable"
      />
    );
  }

  return (
    <div className="space-y-6" data-cy="dashboard-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            System-wide operator view across projects, runtime fleet health,
            intervention pressure, and the last seven days of model usage.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href="/projects"
          >
            Open projects
          </Link>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href="/projects/new"
          >
            Create project
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="space-y-3 p-6" title="Projects">
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">{metrics.projects.total} total</Badge>
            <Badge tone="success">{metrics.projects.active} active</Badge>
            <Badge tone="warning">{metrics.projects.paused} paused</Badge>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {metrics.projects.draft} draft projects still waiting for activation.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {metrics.projects.runtimeAlertProjects} projects currently have runtime
            alerts.
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Runtime health">
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">
              {metrics.runtime.totalRuntimes} runtimes
            </Badge>
            <Badge tone="success">
              {metrics.runtime.onlineRuntimes} online
            </Badge>
            <Badge tone="warning">
              {metrics.runtime.offlineRuntimes} offline
            </Badge>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {metrics.runtime.degradedRuntimes} runtimes are reporting degraded
            health.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {metrics.runtime.activeJobs} active jobs in flight. Busiest project:{' '}
            {metrics.runtime.busiestProjectName ?? 'None'}.
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Interventions">
          <div className="flex flex-wrap gap-2">
            <Badge tone={metrics.interventions.openCases > 0 ? 'warning' : 'neutral'}>
              {metrics.interventions.openCases} open
            </Badge>
            <Badge tone="neutral">
              {metrics.interventions.resolvedCases} resolved
            </Badge>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {metrics.interventions.affectedProjects} projects currently need
            operator attention.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Oldest open summary:{' '}
            {metrics.interventions.oldestOpenSummary ?? 'No open intervention cases.'}
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Usage snapshot">
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">
              {formatNumber(metrics.usage.totalEvents)} events
            </Badge>
            <Badge tone="neutral">
              {formatNumber(metrics.usage.totalTokens)} tokens
            </Badge>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {formatCurrency(metrics.usage.totalCostUsd)} estimated cost for{' '}
            {getDashboardUsageRangeLabel(usageFilters)}.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Top project: {metrics.usage.topProjectName ?? 'None'} at{' '}
            {formatCurrency(metrics.usage.topProjectCostUsd)}. Top model:{' '}
            {metrics.usage.topProviderModel ?? 'No usage yet'}.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4 p-6" title="Project inventory">
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col gap-2 rounded-2xl border border-zinc-900/10 p-4 dark:border-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{project.name}</p>
                  <Badge
                    tone={
                      project.lifecycleStatus === 'active'
                        ? 'success'
                        : project.lifecycleStatus === 'paused'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {project.lifecycleStatus}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Runtime: {project.runtimeStatus} · Spec v
                  {project.productSpecVersion ?? 'none'} · Plan v
                  {project.activePlanVersionNumber ?? 'none'}
                </p>
                <Link
                  className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
                  href={`/projects/${project.id}`}
                >
                  Open project
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 p-6" title="Operational next actions">
          <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              Prioritise the {metrics.interventions.openCases} open intervention
              cases before queue pressure spreads to more projects.
            </li>
            <li>
              Check the {metrics.runtime.offlineRuntimes} offline runtimes and the{' '}
              {metrics.runtime.degradedRuntimes} degraded instances for missed
              heartbeats or blocked leases.
            </li>
            <li>
              Review usage on {metrics.usage.topProjectName ?? 'the busiest project'}
              {' '}where the highest spend window currently sits.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};
