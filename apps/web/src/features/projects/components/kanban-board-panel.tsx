'use client';

import {
  getBoard,
  getProjectDetail,
  projectQueryKeys,
  transitionWorkItem,
} from '@repo/api-client';
import type { KanbanBoardCard, WorkItemState } from '@repo/shared';
import { Button } from '@repo/ui/components/button/button';
import { Card } from '@repo/ui/components/card/card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  QueryLoadingCard,
  QueryStateCard,
} from '../../feedback/components/query-state-card';
import {
  getErrorToastMessage,
  useToast,
} from '../../feedback/components/toast-provider';
import { WorkItemDetailPanel } from './work-item-detail-panel';

const stateDescriptions: Record<WorkItemState, string> = {
  planning: 'Work being structured and clarified.',
  readyForDev: 'Clear, queued work ready for implementation.',
  inDev: 'Implementation actively in progress.',
  readyForReview: 'Development complete and awaiting review pickup.',
  inReview: 'Review is actively in progress.',
  readyForRelease: 'Approved work waiting to ship.',
  requiresHumanIntervention: 'Blocked work that needs an operator decision.',
  released: 'Completed work that shipped successfully.',
};

const priorityClasses: Record<KanbanBoardCard['priority'], string> = {
  low: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  medium: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
};

const formatStateLabel = (value: WorkItemState): string => {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (character) => character.toUpperCase());
};

export const KanbanBoardPanel = ({ projectId }: { projectId: string }) => {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const projectQuery = useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => getProjectDetail(projectId),
  });
  const boardQuery = useQuery({
    queryKey: projectQueryKeys.board(projectId),
    queryFn: () => getBoard(projectId),
  });
  const [draggingCard, setDraggingCard] = useState<KanbanBoardCard | null>(null);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const transitionMutation = useMutation({
    mutationFn: ({
      workItemId,
      toState,
      reason,
    }: {
      workItemId: string;
      toState: WorkItemState;
      reason?: string;
    }) =>
      transitionWorkItem(projectId, workItemId, {
        toState,
        reason,
      }),
    onSuccess: async (response) => {
      setErrorMessage(null);
      queryClient.setQueryData(projectQueryKeys.board(projectId), response.data);
      await queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(projectId),
      });
    },
    onError: (error) => {
      const message = getErrorToastMessage(
        error,
        'Unable to move the selected work item.',
      );
      setErrorMessage(message);
      pushToast({
        description: message,
        title: 'Board transition failed',
        variant: 'error',
      });
    },
  });

  const totalCardCount = useMemo(() => {
    return boardQuery.data?.columns.reduce(
      (count, column) => count + column.items.length,
      0,
    );
  }, [boardQuery.data]);

  if (projectQuery.isLoading || boardQuery.isLoading) {
    return (
      <QueryLoadingCard
        title="Loading kanban board"
        description="Fetching workflow columns and work items from the API."
      />
    );
  }

  if (projectQuery.isError || boardQuery.isError || !projectQuery.data || !boardQuery.data) {
    return (
      <QueryStateCard
        title="Kanban board unavailable"
        description="The board could not be loaded. Confirm the API is available and the project still exists."
        onRetry={() => {
          void projectQuery.refetch();
          void boardQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Kanban board for {projectQuery.data.name}
          </h1>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Drag tasks and subtasks between strict workflow columns. All state
            changes are validated by the API before the board updates.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/planning`}
          >
            Open planning hierarchy
          </Link>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}`}
          >
            Back to project overview
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Card className="p-6" title="Board summary">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Total cards: {totalCardCount ?? 0}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            In dev: {boardQuery.data.counts.inDev}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Ready for review: {boardQuery.data.counts.readyForReview}
          </p>
        </Card>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-5">
        {boardQuery.data.columns.map((column) => (
          <section
            key={column.state}
            className="min-h-72 rounded-3xl border border-zinc-800/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();

              if (!draggingCard || draggingCard.state === column.state) {
                return;
              }

              const reason =
                column.state === 'requiresHumanIntervention'
                  ? window.prompt(
                      'Reason for moving this work item to requires human intervention:',
                    ) ?? undefined
                  : undefined;

              transitionMutation.mutate({
                workItemId: draggingCard.id,
                toState: column.state,
                reason,
              });
              setDraggingCard(null);
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {column.label}
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {stateDescriptions[column.state]}
                </p>
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {column.items.length}
              </span>
            </div>

            <div className="space-y-3">
              {column.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800/10 px-4 py-6 text-center text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  Drop a card here.
                </div>
              ) : (
                column.items.map((card) => (
                  <article
                    key={card.id}
                    draggable
                    className="cursor-grab rounded-2xl border border-zinc-800/10 bg-zinc-50 p-4 shadow-sm transition hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-950/60"
                    onDragStart={() => setDraggingCard(card)}
                    onDragEnd={() => setDraggingCard(null)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {card.kind} · {card.epicTitle}
                        </p>
                        <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          {card.title}
                        </h3>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${priorityClasses[card.priority]}`}
                      >
                        {card.priority}
                      </span>
                    </div>

                    {card.description ? (
                      <p className="mt-3 line-clamp-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {card.description}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>
                        Criteria {card.completedAcceptanceCriteriaCount}/
                        {card.acceptanceCriteriaCount}
                      </span>
                      <span>Dependencies {card.dependencyIds.length}</span>
                      <span>{formatStateLabel(card.state)}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button onClick={() => setSelectedWorkItemId(card.id)}>
                        Open details
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <span>Drag and drop enabled.</span>
        {transitionMutation.isPending ? <span>Applying workflow transition…</span> : null}
      </div>

      {selectedWorkItemId ? (
        <WorkItemDetailPanel
          projectId={projectId}
          workItemId={selectedWorkItemId}
          onClose={() => setSelectedWorkItemId(null)}
        />
      ) : null}
    </div>
  );
};
