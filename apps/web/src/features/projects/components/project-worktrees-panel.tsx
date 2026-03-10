'use client';

import {
  getProjectDetail,
  getProjectWorktrees,
  projectQueryKeys,
  requestProjectWorktreeCleanup,
} from '@repo/api-client';
import type { WorktreeResponse } from '@repo/shared';
import { Button } from '@repo/ui/components/button/button';
import { Card } from '@repo/ui/components/card/card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { WorktreeStatusBadge } from './worktree-status-badge';

const formatTimestamp = (value: string | null): string => {
  if (!value) {
    return 'Not recorded';
  }

  return new Date(value).toLocaleString();
};

const formatRelativeAge = (value: string): string => {
  const ageSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );

  if (ageSeconds < 60) {
    return `${ageSeconds}s ago`;
  }

  if (ageSeconds < 3600) {
    return `${Math.floor(ageSeconds / 60)}m ago`;
  }

  if (ageSeconds < 86400) {
    return `${Math.floor(ageSeconds / 3600)}h ago`;
  }

  return `${Math.floor(ageSeconds / 86400)}d ago`;
};

const canRequestCleanup = (worktree: WorktreeResponse): boolean => {
  return !['cleanupPending', 'archived'].includes(worktree.status);
};

export const ProjectWorktreesPanel = ({
  projectId,
}: {
  projectId: string;
}) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => getProjectDetail(projectId),
  });

  const worktreesQuery = useQuery({
    queryKey: projectQueryKeys.worktrees(projectId),
    queryFn: () => getProjectWorktrees(projectId),
  });

  const cleanupMutation = useMutation({
    mutationFn: ({
      worktreeId,
      reason,
    }: {
      worktreeId: string;
      reason?: string;
    }) => requestProjectWorktreeCleanup(projectId, worktreeId, { reason }),
    onSuccess: async () => {
      setErrorMessage(null);
      await queryClient.invalidateQueries({
        queryKey: projectQueryKeys.worktrees(projectId),
      });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to request worktree cleanup.',
      );
    },
  });

  if (projectQuery.isLoading || worktreesQuery.isLoading) {
    return (
      <Card className="p-6" title="Loading worktrees">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Fetching task worktree state and repository branches from the API.
        </p>
      </Card>
    );
  }

  if (
    projectQuery.isError ||
    worktreesQuery.isError ||
    !projectQuery.data ||
    !worktreesQuery.data
  ) {
    return (
      <Card className="p-6" title="Worktrees unavailable">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The worktree view could not be loaded. Confirm the API is available
          and the project still exists.
        </p>
      </Card>
    );
  }

  const worktrees = worktreesQuery.data.items;
  const dirtyCount = worktrees.filter((worktree) => worktree.isDirty).length;
  const activeCount = worktrees.filter((worktree) =>
    ['active', 'lockedByDev', 'lockedByReview', 'lockedByRelease'].includes(
      worktree.status,
    ),
  ).length;

  return (
    <div className="space-y-6" data-cy="project-worktrees-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Worktrees for {projectQuery.data.name}
          </h1>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Track task-scoped branches, pull request links, and cleanup state
            across the runtime fleet.
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
            href={`/projects/${projectId}/runtime`}
          >
            Open runtime monitor
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
            href={`/projects/${projectId}/board`}
          >
            Open kanban board
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="space-y-3 p-6" title="Worktree summary">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Total worktrees: {worktrees.length}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Active or locked: {activeCount}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Dirty worktrees: {dirtyCount}
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Repository">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {projectQuery.data.repository.owner}/{projectQuery.data.repository.name}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Default branch: {projectQuery.data.repository.defaultBranch}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Base branch: {projectQuery.data.repository.baseBranch}
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Cleanup queue">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Pending cleanup:{' '}
            {
              worktrees.filter((worktree) => worktree.status === 'cleanupPending')
                .length
            }
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Archived:{' '}
            {
              worktrees.filter((worktree) => worktree.status === 'archived')
                .length
            }
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Failed or stale:{' '}
            {
              worktrees.filter((worktree) =>
                ['failed', 'stale'].includes(worktree.status),
              ).length
            }
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Last seen">
          {worktrees.length > 0 ? (
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {worktrees.slice(0, 3).map((worktree) => (
                <li key={worktree.id}>
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">
                    {worktree.branchName}
                  </p>
                  <p>{formatRelativeAge(worktree.lastSeenAt)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No worktree heartbeat or sync activity has been recorded yet.
            </p>
          )}
        </Card>
      </div>

      {errorMessage ? (
        <Card className="p-6" title="Cleanup request failed">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {errorMessage}
          </p>
        </Card>
      ) : null}

      <Card className="space-y-4 p-6" title="Worktree inventory">
        {worktrees.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No worktrees have been created for this project yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {worktrees.map((worktree) => (
              <li
                key={worktree.id}
                className="rounded-2xl border border-zinc-800/10 p-5 dark:border-white/10"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                        {worktree.branchName}
                      </h2>
                      <WorktreeStatusBadge status={worktree.status} />
                      {worktree.isDirty ? (
                        <span
                          className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
                          data-cy="dirty-worktree-badge"
                        >
                          Dirty
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Path
                        </p>
                        <p className="mt-1 break-all text-sm text-zinc-700 dark:text-zinc-300">
                          {worktree.path}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Branch base
                        </p>
                        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                          {worktree.baseBranch}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Runtime
                        </p>
                        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                          {worktree.runtimeId ?? 'Not assigned'}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Head SHA
                        </p>
                        <p className="mt-1 break-all text-sm text-zinc-700 dark:text-zinc-300">
                          {worktree.headSha ?? 'Not reported'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Last seen
                        </p>
                        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                          {formatTimestamp(worktree.lastSeenAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Cleanup requested
                        </p>
                        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                          {formatTimestamp(worktree.cleanupRequestedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Branch and PR summary
                      </p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        PR:{' '}
                        {worktree.pullRequestUrl ? (
                          <a
                            className="font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
                            href={worktree.pullRequestUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {worktree.pullRequestUrl}
                          </a>
                        ) : (
                          'Not linked yet'
                        )}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {worktree.details ?? 'No additional worktree detail provided.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:w-52">
                    <Button
                      disabled={
                        cleanupMutation.isPending || !canRequestCleanup(worktree)
                      }
                      onClick={() =>
                        cleanupMutation.mutate({
                          worktreeId: worktree.id,
                          reason: `Cleanup requested from operator UI for ${worktree.branchName}.`,
                        })
                      }
                    >
                      {worktree.status === 'cleanupPending'
                        ? 'Cleanup requested'
                        : 'Request cleanup'}
                    </Button>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Cleanup can be requested for active, stale, failed, or
                      locked worktrees. Archived worktrees are already complete.
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
