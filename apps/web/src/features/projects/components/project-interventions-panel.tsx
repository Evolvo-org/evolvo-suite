'use client';

import {
  getProjectDetail,
  listHumanInterventions,
  projectQueryKeys,
  resolveHumanIntervention,
  retryHumanIntervention,
} from '@repo/api-client';
import type {
  HumanInterventionCaseRecord,
  InterventionRetryState,
} from '@repo/shared';
import { interventionRetryStates } from '@repo/shared';
import { Button } from '@repo/ui/components/button/button';
import { Card } from '@repo/ui/components/card/card';
import { Select } from '@repo/ui/components/select/select';
import { Textarea } from '@repo/ui/components/textarea/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  QueryLoadingCard,
  QueryStateCard,
} from '../../feedback/components/query-state-card';
import {
  getErrorToastMessage,
  useToast,
} from '../../feedback/components/toast-provider';
import { HumanInterventionStatusBadge } from './human-intervention-status-badge';

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

const categorizeIntervention = (item: HumanInterventionCaseRecord): string => {
  const combined = `${item.summary} ${item.reason}`.toLowerCase();

  if (combined.includes('missing config') || combined.includes('missing secret')) {
    return 'Missing config';
  }

  if (combined.includes('merge conflict')) {
    return 'Merge conflict';
  }

  if (combined.includes('review')) {
    return 'Review failure';
  }

  if (combined.includes('ambigu')) {
    return 'Ambiguity';
  }

  if (combined.includes('runtime')) {
    return 'Runtime failure';
  }

  return 'Other';
};

const getRetryLabel = (value: InterventionRetryState): string => {
  switch (value) {
    case 'readyForDev':
      return 'Ready for dev';
    default:
      return 'Planning';
  }
};

export const ProjectInterventionsPanel = ({
  projectId,
}: {
  projectId: string;
}) => {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(
    null,
  );
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [retryState, setRetryState] = useState<InterventionRetryState>('planning');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => getProjectDetail(projectId),
  });

  const interventionsQuery = useQuery({
    queryKey: projectQueryKeys.interventions(projectId),
    queryFn: () => listHumanInterventions(projectId),
  });

  const interventions = interventionsQuery.data?.items ?? [];
  const selectedIntervention =
    interventions.find((item) => item.id === selectedInterventionId) ??
    interventions[0] ??
    null;

  useEffect(() => {
    if (!selectedInterventionId && interventions.length > 0) {
      setSelectedInterventionId(interventions[0]?.id ?? null);
    }
  }, [interventions, selectedInterventionId]);

  useEffect(() => {
    setResolutionNotes(selectedIntervention?.resolutionNotes ?? '');
    setRetryState('planning');
    setErrorMessage(null);
  }, [selectedIntervention?.resolutionNotes]);

  const refreshProjectState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.interventions(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.board(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.planningHierarchy(projectId),
      }),
    ]);
  };

  const resolveMutation = useMutation({
    mutationFn: (interventionId: string) =>
      resolveHumanIntervention(projectId, interventionId, {
        resolutionNotes: resolutionNotes.trim() || undefined,
      }),
    onSuccess: async ({ data }) => {
      setSelectedInterventionId(data.id);
      setErrorMessage(null);
      await refreshProjectState();
    },
    onError: (error) => {
      const message = getErrorToastMessage(
        error,
        'Unable to resolve the intervention case.',
      );
      setErrorMessage(message);
      pushToast({
        description: message,
        title: 'Intervention resolve failed',
        variant: 'error',
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (interventionId: string) =>
      retryHumanIntervention(projectId, interventionId, {
        toState: retryState,
        resolutionNotes: resolutionNotes.trim() || undefined,
      }),
    onSuccess: async ({ data }) => {
      setSelectedInterventionId(data.id);
      setErrorMessage(null);
      await refreshProjectState();
    },
    onError: (error) => {
      const message = getErrorToastMessage(
        error,
        'Unable to retry the intervention case.',
      );
      setErrorMessage(message);
      pushToast({
        description: message,
        title: 'Intervention retry failed',
        variant: 'error',
      });
    },
  });

  if (projectQuery.isLoading || interventionsQuery.isLoading) {
    return (
      <QueryLoadingCard
        title="Loading intervention queue"
        description="Fetching blocked work, evidence, and operator recovery actions from the API."
      />
    );
  }

  if (
    projectQuery.isError ||
    interventionsQuery.isError ||
    !projectQuery.data ||
    !interventionsQuery.data
  ) {
    return (
      <QueryStateCard
        title="Intervention queue unavailable"
        description="The intervention queue could not be loaded. Confirm the API is available and the project still exists."
        onRetry={() => {
          void projectQuery.refetch();
          void interventionsQuery.refetch();
        }}
      />
    );
  }

  const openInterventions = interventions.filter((item) => item.status === 'open');
  const resolvedInterventions = interventions.filter(
    (item) => item.status === 'resolved',
  );
  const oldestOpenIntervention = [...openInterventions].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )[0];
  const reasonCounts = openInterventions.reduce<Record<string, number>>(
    (counts, item) => {
      const label = categorizeIntervention(item);
      counts[label] = (counts[label] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const isMutating = resolveMutation.isPending || retryMutation.isPending;

  return (
    <div className="space-y-6" data-cy="project-interventions-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Intervention queue for {projectQuery.data.name}
          </h1>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Review blocked work, inspect evidence, and decide whether to resolve
            a case or route the work item back into automation.
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
            href={`/projects/${projectId}/usage`}
          >
            Open usage analytics
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="space-y-3 p-6" title="Queue summary">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Total cases: {interventions.length}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Open cases: {openInterventions.length}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Resolved cases: {resolvedInterventions.length}
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Oldest open case">
          {oldestOpenIntervention ? (
            <>
              <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                {oldestOpenIntervention.workItemTitle}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Open for {formatRelativeAge(oldestOpenIntervention.createdAt)}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {categorizeIntervention(oldestOpenIntervention)}
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No open intervention cases remain for this project.
            </p>
          )}
        </Card>

        <Card className="space-y-3 p-6" title="Retry approvals">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Cases retried:{' '}
            {resolvedInterventions.filter((item) => item.retryCount > 0).length}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Total retries approved:{' '}
            {resolvedInterventions.reduce((count, item) => count + item.retryCount, 0)}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Ready for operator retry:{' '}
            {openInterventions.filter((item) => item.suggestedAction !== null).length}
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Open categories">
          {Object.entries(reasonCounts).length > 0 ? (
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {Object.entries(reasonCounts).map(([label, count]) => (
                <li key={label}>
                  {label}: {count}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No open intervention categories are currently active.
            </p>
          )}
        </Card>
      </div>

      {errorMessage ? (
        <Card className="p-6" title="Intervention action failed">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {errorMessage}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <Card className="space-y-4 p-6" title="Intervention list">
          {interventions.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No human intervention cases have been recorded for this project
              yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {interventions.map((item) => {
                const isSelected = item.id === selectedIntervention?.id;

                return (
                  <li key={item.id}>
                    <button
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-zinc-950 bg-zinc-100/80 dark:border-zinc-100 dark:bg-zinc-950/60'
                          : 'border-zinc-800/10 hover:border-zinc-800/30 dark:border-white/10 dark:hover:border-white/20'
                      }`}
                      data-cy={`intervention-row-${item.id}`}
                      onClick={() => setSelectedInterventionId(item.id)}
                      type="button"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                            {item.workItemTitle}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {categorizeIntervention(item)}
                          </p>
                        </div>
                        <HumanInterventionStatusBadge status={item.status} />
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                        <p>{item.summary}</p>
                        <p>Opened {formatRelativeAge(item.createdAt)}</p>
                        <p>Retry count: {item.retryCount}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-4 p-6" title="Intervention detail panel">
          {selectedIntervention ? (
            <div className="space-y-5" data-cy="intervention-detail-panel">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {selectedIntervention.workItemTitle}
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {selectedIntervention.summary}
                  </p>
                </div>
                <HumanInterventionStatusBadge status={selectedIntervention.status} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Reason category
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {categorizeIntervention(selectedIntervention)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Retry count
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedIntervention.retryCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Opened
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {formatTimestamp(selectedIntervention.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Resolved
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {formatTimestamp(selectedIntervention.resolvedAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Reason
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                  {selectedIntervention.reason}
                </p>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Evidence display
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedIntervention.evidence ?? 'No evidence has been attached yet.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Attempts made
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedIntervention.attemptsMade ??
                      'No attempt history has been recorded yet.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Suggested action display
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedIntervention.suggestedAction ??
                      'No suggested action has been recorded yet.'}
                  </p>
                </div>

                {selectedIntervention.resolutionNotes ? (
                  <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Resolution notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                      {selectedIntervention.resolutionNotes}
                    </p>
                  </div>
                ) : null}
              </div>

              {selectedIntervention.status === 'open' ? (
                <div className="space-y-4 rounded-2xl bg-zinc-100/80 p-4 dark:bg-zinc-950/60">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      Operator action
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Add optional notes, then either resolve the case or return
                      the work item to {getRetryLabel(retryState).toLowerCase()}.
                    </p>
                  </div>

                  <label
                    className="space-y-2 text-sm font-medium text-zinc-950 dark:text-zinc-50"
                    htmlFor="intervention-retry-target"
                  >
                    <span>Retry target</span>
                    <Select
                      data-cy="intervention-retry-target"
                      id="intervention-retry-target"
                      onChange={(event) =>
                        setRetryState(event.target.value as InterventionRetryState)
                      }
                      value={retryState}
                    >
                      {interventionRetryStates.map((value) => (
                        <option key={value} value={value}>
                          {getRetryLabel(value)}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label
                    className="space-y-2 text-sm font-medium text-zinc-950 dark:text-zinc-50"
                    htmlFor="intervention-operator-notes"
                  >
                    <span>Operator notes</span>
                    <Textarea
                      data-cy="intervention-operator-notes"
                      id="intervention-operator-notes"
                      onChange={(event) => setResolutionNotes(event.target.value)}
                      placeholder="Document what was fixed, clarified, or approved before sending this work back into automation."
                      rows={5}
                      value={resolutionNotes}
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      data-cy="intervention-retry-button"
                      disabled={isMutating}
                      onClick={() => retryMutation.mutate(selectedIntervention.id)}
                    >
                      {retryMutation.isPending
                        ? 'Retrying...'
                        : `Retry to ${getRetryLabel(retryState)}`}
                    </Button>
                    <Button
                      className="bg-white text-zinc-950 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                      data-cy="intervention-resolve-button"
                      disabled={isMutating}
                      onClick={() => resolveMutation.mutate(selectedIntervention.id)}
                    >
                      {resolveMutation.isPending
                        ? 'Resolving...'
                        : 'Resolve without retry'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  This case is closed. Review the recorded notes and audit
                  history if more follow-up work is needed.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Select an intervention case to inspect evidence and suggested
              recovery actions.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};
