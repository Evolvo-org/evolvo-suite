'use client';

import {
  authQueryKeys,
  getCurrentUser,
  getProjectDetail,
  getProjectUsageSummary,
  getUserUsageSummary,
  projectQueryKeys,
} from '@repo/api-client';
import type { UsageBreakdownItem } from '@repo/shared';
import { Button } from '@repo/ui/components/button/button';
import { Card } from '@repo/ui/components/card/card';
import { Input } from '@repo/ui/components/input/input';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('en-GB').format(value);

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value > 0 && value < 1 ? 4 : 2,
    maximumFractionDigits: value > 0 && value < 1 ? 4 : 2,
  }).format(value);

const formatLabel = (value: string): string => {
  return value
    .split(/[:_-]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const getBarWidth = (value: number, maxValue: number): string => {
  if (maxValue <= 0) {
    return '0%';
  }

  return `${Math.max((value / maxValue) * 100, 6)}%`;
};

const getDateRangeLabel = (filters: { from?: string; to?: string }): string => {
  if (!filters.from && !filters.to) {
    return 'All recorded usage';
  }

  return `${filters.from ?? 'Start'} to ${filters.to ?? 'Now'}`;
};

const getTopBreakdownItem = (
  items: UsageBreakdownItem[],
): UsageBreakdownItem | null => {
  return [...items].sort(
    (left, right) => right.estimatedCostUsd - left.estimatedCostUsd,
  )[0] ?? null;
};

const renderBreakdownList = ({
  emptyCopy,
  items,
  metric,
}: {
  emptyCopy: string;
  items: UsageBreakdownItem[];
  metric: 'totalTokens' | 'estimatedCostUsd';
}) => {
  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {emptyCopy}
      </p>
    );
  }

  const maxValue = Math.max(...items.map((item) => item[metric]));

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {formatLabel(item.key)}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.totalEvents} events
              </p>
            </div>
            <div className="text-right text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                {formatNumber(item.totalTokens)} tokens
              </p>
              <p>{formatCurrency(item.estimatedCostUsd)}</p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-2 rounded-full bg-zinc-950 dark:bg-zinc-100"
              style={{
                width: getBarWidth(item[metric], maxValue),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

export const ProjectUsageAnalyticsPanel = ({
  projectId,
}: {
  projectId: string;
}) => {
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<{
    from?: string;
    to?: string;
  }>({});
  const [userIdInput, setUserIdInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const projectQuery = useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => getProjectDetail(projectId),
  });

  const currentUserQuery = useQuery({
    queryKey: authQueryKeys.currentUser,
    queryFn: () => getCurrentUser(),
  });

  const projectUsageQuery = useQuery({
    queryKey: projectQueryKeys.usageSummary(projectId, appliedFilters),
    queryFn: () => getProjectUsageSummary(projectId, appliedFilters),
  });

  useEffect(() => {
    if (!currentUserQuery.data || selectedUserId) {
      return;
    }

    setSelectedUserId(currentUserQuery.data.userId);
    setUserIdInput(currentUserQuery.data.userId);
  }, [currentUserQuery.data, selectedUserId]);

  const trimmedSelectedUserId = selectedUserId.trim();

  const userUsageQuery = useQuery({
    enabled: trimmedSelectedUserId.length > 0,
    queryKey: projectQueryKeys.userUsageSummary(trimmedSelectedUserId, appliedFilters),
    queryFn: () => getUserUsageSummary(trimmedSelectedUserId, appliedFilters),
  });

  const userDisplayLabel = useMemo(() => {
    if (
      currentUserQuery.data &&
      trimmedSelectedUserId === currentUserQuery.data.userId
    ) {
      return currentUserQuery.data.displayName ?? currentUserQuery.data.userId;
    }

    return trimmedSelectedUserId || 'No user selected';
  }, [currentUserQuery.data, trimmedSelectedUserId]);

  if (projectQuery.isLoading || projectUsageQuery.isLoading) {
    return (
      <Card className="p-6" title="Loading usage analytics">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Fetching project usage totals, provider costs, and user activity from
          the API.
        </p>
      </Card>
    );
  }

  if (
    projectQuery.isError ||
    projectUsageQuery.isError ||
    !projectQuery.data ||
    !projectUsageQuery.data
  ) {
    return (
      <Card className="p-6" title="Usage analytics unavailable">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The usage analytics view could not be loaded. Confirm the API is
          available and the project still exists.
        </p>
      </Card>
    );
  }

  const projectUsage = projectUsageQuery.data;
  const selectedUserUsage = userUsageQuery.data;
  const topProjectModel = getTopBreakdownItem(projectUsage.byProviderModel);
  const topUserAgent = selectedUserUsage
    ? getTopBreakdownItem(selectedUserUsage.byAgent)
    : null;

  return (
    <div className="space-y-6" data-cy="project-usage-analytics-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Usage analytics for {projectQuery.data.name}
          </h1>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Review token volume, estimated model spend, and operator or agent
            consumption across this project.
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
            href={`/projects/${projectId}/interventions`}
          >
            Open interventions
          </Link>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/runtime`}
          >
            Open runtime monitor
          </Link>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/settings`}
          >
            Open settings
          </Link>
        </div>
      </div>

      <Card className="space-y-4 p-6" title="Filters">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label
            className="space-y-2 text-sm font-medium text-zinc-950 dark:text-zinc-50"
            htmlFor="usage-from-date"
          >
            <span>From</span>
            <Input
              id="usage-from-date"
              onChange={(event) => setFromInput(event.target.value)}
              type="date"
              value={fromInput}
            />
          </label>
          <label
            className="space-y-2 text-sm font-medium text-zinc-950 dark:text-zinc-50"
            htmlFor="usage-to-date"
          >
            <span>To</span>
            <Input
              id="usage-to-date"
              onChange={(event) => setToInput(event.target.value)}
              type="date"
              value={toInput}
            />
          </label>
          <div className="flex items-end gap-3">
            <Button
              data-cy="usage-apply-range"
              onClick={() =>
                setAppliedFilters({
                  from: fromInput || undefined,
                  to: toInput || undefined,
                })
              }
            >
              Apply range
            </Button>
            <Button
              className="bg-white text-zinc-950 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
              onClick={() => {
                setFromInput('');
                setToInput('');
                setAppliedFilters({});
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label
            className="space-y-2 text-sm font-medium text-zinc-950 dark:text-zinc-50"
            htmlFor="usage-user-id"
          >
            <span>User ID</span>
            <Input
              data-cy="usage-user-id"
              id="usage-user-id"
              onChange={(event) => setUserIdInput(event.target.value)}
              placeholder="user-123"
              value={userIdInput}
            />
          </label>
          <div className="flex items-end">
            <Button
              data-cy="usage-load-user"
              onClick={() => setSelectedUserId(userIdInput.trim())}
            >
              Load user usage
            </Button>
          </div>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Active range: {getDateRangeLabel(appliedFilters)}
        </p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="space-y-3 p-6" title="Project usage overview">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Total events: {projectUsage.totalEvents}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Total tokens: {formatNumber(projectUsage.totalTokens)}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Estimated cost: {formatCurrency(projectUsage.estimatedCostUsd)}
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Token mix">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Input tokens: {formatNumber(projectUsage.inputTokens)}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Output tokens: {formatNumber(projectUsage.outputTokens)}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Top cost model:{' '}
            {topProjectModel ? formatLabel(topProjectModel.key) : 'No usage recorded'}
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Selected user">
          <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
            {userDisplayLabel}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Events: {selectedUserUsage?.totalEvents ?? 0}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tokens: {formatNumber(selectedUserUsage?.totalTokens ?? 0)}
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Estimated cost widgets">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Project average per event:{' '}
            {projectUsage.totalEvents > 0
              ? formatCurrency(projectUsage.estimatedCostUsd / projectUsage.totalEvents)
              : formatCurrency(0)}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Selected user cost:{' '}
            {formatCurrency(selectedUserUsage?.estimatedCostUsd ?? 0)}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Top user agent:{' '}
            {topUserAgent ? formatLabel(topUserAgent.key) : 'No user usage loaded'}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4 p-6" title="Project usage chart">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Project usage by agent for {getDateRangeLabel(appliedFilters)}.
          </p>
          {renderBreakdownList({
            emptyCopy: 'No project usage has been recorded in this range.',
            items: [...projectUsage.byAgent].sort(
              (left, right) => right.totalTokens - left.totalTokens,
            ),
            metric: 'totalTokens',
          })}
        </Card>

        <Card className="space-y-4 p-6" title="User usage chart">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Usage by agent for {userDisplayLabel}.
          </p>
          {userUsageQuery.isLoading ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading user usage summary.
            </p>
          ) : userUsageQuery.isError ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              User usage could not be loaded for this identifier.
            </p>
          ) : renderBreakdownList({
              emptyCopy: 'No usage has been recorded for the selected user and range.',
              items: [...(selectedUserUsage?.byAgent ?? [])].sort(
                (left, right) => right.totalTokens - left.totalTokens,
              ),
              metric: 'totalTokens',
            })}
        </Card>
      </div>

      <Card className="space-y-4 p-6" title="Model/provider breakdown">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Estimated spend and token volume grouped by provider and model.
        </p>
        {renderBreakdownList({
          emptyCopy: 'No provider or model usage has been recorded in this range.',
          items: [...projectUsage.byProviderModel].sort(
            (left, right) => right.estimatedCostUsd - left.estimatedCostUsd,
          ),
          metric: 'estimatedCostUsd',
        })}
      </Card>
    </div>
  );
};
