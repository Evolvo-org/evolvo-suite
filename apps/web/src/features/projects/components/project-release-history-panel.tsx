'use client';

import {
  getProjectDetail,
  getReleaseHistory,
  projectQueryKeys,
} from '@repo/api-client';
import type { ReleaseRunRecord } from '@repo/shared';
import { Card } from '@repo/ui/components/card/card';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ReleaseStatusBadge } from './release-status-badge';

const formatTimestamp = (value: string | null): string => {
  if (!value) {
    return 'Not recorded';
  }

  return new Date(value).toLocaleString();
};

const getReleaseLabel = (release: ReleaseRunRecord): string => {
  return release.version?.version ?? release.version?.tagName ?? release.workItemTitle;
};

export const ProjectReleaseHistoryPanel = ({
  projectId,
}: {
  projectId: string;
}) => {
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => getProjectDetail(projectId),
  });

  const releaseHistoryQuery = useQuery({
    queryKey: projectQueryKeys.releases(projectId),
    queryFn: () => getReleaseHistory(projectId),
  });

  useEffect(() => {
    if (!selectedReleaseId && releaseHistoryQuery.data?.items.length) {
      setSelectedReleaseId(releaseHistoryQuery.data.items[0]?.id ?? null);
    }
  }, [releaseHistoryQuery.data, selectedReleaseId]);

  if (projectQuery.isLoading || releaseHistoryQuery.isLoading) {
    return (
      <Card className="p-6" title="Loading releases">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Fetching release history, version tags, and published notes from the
          API.
        </p>
      </Card>
    );
  }

  if (
    projectQuery.isError ||
    releaseHistoryQuery.isError ||
    !projectQuery.data ||
    !releaseHistoryQuery.data
  ) {
    return (
      <Card className="p-6" title="Release history unavailable">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The release history view could not be loaded. Confirm the API is
          available and the project still exists.
        </p>
      </Card>
    );
  }

  const releases = releaseHistoryQuery.data.items;
  const selectedRelease =
    releases.find((release) => release.id === selectedReleaseId) ?? releases[0] ?? null;

  return (
    <div className="space-y-6" data-cy="project-release-history-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Releases for {projectQuery.data.name}
          </h1>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Review release runs, version tags, merge details, and published
            release notes for this project.
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
            href={`/projects/${projectId}/worktrees`}
          >
            Open worktrees
          </Link>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/runtime`}
          >
            Open runtime monitor
          </Link>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/interventions`}
          >
            Open interventions
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="space-y-3 p-6" title="Release summary">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Total release runs: {releases.length}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Succeeded:{' '}
            {releases.filter((release) => release.status === 'succeeded').length}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Failed or cancelled:{' '}
            {
              releases.filter((release) =>
                ['failed', 'cancelled'].includes(release.status),
              ).length
            }
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Latest version">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {releases[0]?.version?.version ?? 'No version recorded yet'}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tag: {releases[0]?.version?.tagName ?? 'Not tagged yet'}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Released: {formatTimestamp(releases[0]?.completedAt ?? null)}
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Published notes">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Runs with release notes:{' '}
            {releases.filter((release) => release.note !== null).length}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Markdown notes:{' '}
            {
              releases.filter((release) => release.note?.format === 'markdown')
                .length
            }
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Plain text notes:{' '}
            {
              releases.filter((release) => release.note?.format === 'plainText')
                .length
            }
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Release links">
          {releases[0]?.releaseUrl ? (
            <a
              className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
              href={releases[0].releaseUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open latest release URL
            </a>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No external release URL has been recorded yet.
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="space-y-4 p-6" title="Version list">
          {releases.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No release history has been recorded for this project yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {releases.map((release) => {
                const isSelected = release.id === selectedRelease?.id;

                return (
                  <li key={release.id}>
                    <button
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-zinc-950 bg-zinc-100/80 dark:border-zinc-100 dark:bg-zinc-950/60'
                          : 'border-zinc-800/10 hover:border-zinc-800/30 dark:border-white/10 dark:hover:border-white/20'
                      }`}
                      onClick={() => setSelectedReleaseId(release.id)}
                      type="button"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                            {getReleaseLabel(release)}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {release.workItemTitle}
                          </p>
                        </div>
                        <ReleaseStatusBadge status={release.status} />
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <p>Tag: {release.version?.tagName ?? 'Not tagged yet'}</p>
                        <p>Completed: {formatTimestamp(release.completedAt)}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-4 p-6" title="Release detail panel">
          {selectedRelease ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {getReleaseLabel(selectedRelease)}
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {selectedRelease.workItemTitle}
                  </p>
                </div>
                <ReleaseStatusBadge status={selectedRelease.status} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Version
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedRelease.version?.version ?? 'Not versioned'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Tag
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedRelease.version?.tagName ?? 'Not tagged'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Merge commit
                  </p>
                  <p className="mt-1 break-all text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedRelease.mergeCommitSha ?? 'Not recorded'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Runtime
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedRelease.runtimeId ?? 'Not recorded'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <p>
                  Started: {formatTimestamp(selectedRelease.startedAt)}
                </p>
                <p>
                  Completed: {formatTimestamp(selectedRelease.completedAt)}
                </p>
                <p>
                  Summary: {selectedRelease.summary ?? 'No summary recorded.'}
                </p>
                <p>
                  Error: {selectedRelease.errorMessage ?? 'No release error recorded.'}
                </p>
                <p>
                  Release URL:{' '}
                  {selectedRelease.releaseUrl ? (
                    <a
                      className="font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
                      href={selectedRelease.releaseUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selectedRelease.releaseUrl}
                    </a>
                  ) : (
                    'Not recorded'
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Release notes rendering
                </p>
                {selectedRelease.note ? (
                  <article className="rounded-2xl bg-zinc-100/80 p-4 dark:bg-zinc-950/60">
                    <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      {selectedRelease.note.title ?? 'Release notes'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Format: {selectedRelease.note.format}
                    </p>
                    <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                      {selectedRelease.note.content}
                    </div>
                  </article>
                ) : (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    No release note content has been recorded for this run.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Select a release run to inspect version metadata and notes.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};
