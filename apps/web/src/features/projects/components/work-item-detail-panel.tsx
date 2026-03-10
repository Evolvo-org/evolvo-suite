'use client';

import {
  createWorkItemComment,
  getWorkItemComments,
  getWorkItemDetail,
  getWorkItemTimeline,
  projectQueryKeys,
  updateAcceptanceCriterion,
  updateWorkItem,
} from '@repo/api-client';
import type {
  WorkItemAuditEvent,
  WorkItemCommentActorType,
  WorkItemPriority,
} from '@repo/shared';
import { Button } from '@repo/ui/components/button/button';
import { Input } from '@repo/ui/components/input/input';
import { Select } from '@repo/ui/components/select/select';
import { Textarea } from '@repo/ui/components/textarea/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

const actorTypeOptions: WorkItemCommentActorType[] = ['human', 'agent', 'system'];
const priorityOptions: WorkItemPriority[] = ['low', 'medium', 'high', 'urgent'];

const formatLabel = (value: string): string => {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (character) => character.toUpperCase());
};

const formatTimelineTypeLabel = (item: WorkItemAuditEvent): string => {
  switch (item.type) {
    case 'agentRun':
      return 'Agent run';
    case 'reviewGate':
      return 'Review gate';
    case 'transition':
      return 'Transition';
    default:
      return 'Comment';
  }
};

const renderTimelineDetails = (item: WorkItemAuditEvent): string[] => {
  if (item.type === 'transition') {
    return item.metadata?.reason ? [`Reason: ${item.metadata.reason}`] : [];
  }

  if (item.type === 'agentRun') {
    const details = [
      `Status: ${formatLabel(item.metadata?.agentRunStatus ?? 'running')}`,
      `Decisions: ${item.metadata?.decisionCount ?? 0}`,
      `Artifacts: ${item.metadata?.artifactCount ?? 0}`,
    ];

    if (item.metadata?.completedAt) {
      details.push(`Completed: ${new Date(item.metadata.completedAt).toLocaleString()}`);
    }

    if (item.metadata?.failureMessage) {
      details.push(`Failure: ${item.metadata.failureMessage}`);
    }

    return details;
  }

  if (item.type === 'reviewGate') {
    return [
      `Status: ${formatLabel(item.metadata?.reviewGateOverallStatus ?? 'passed')}`,
      `Checks: ${item.metadata?.reviewGatePassedChecks ?? 0} passed, ${item.metadata?.reviewGateFailedChecks ?? 0} failed, ${item.metadata?.reviewGateSkippedChecks ?? 0} skipped`,
      `Total checks: ${item.metadata?.reviewGateTotalChecks ?? 0}`,
    ];
  }

  return [];
};

export const WorkItemDetailPanel = ({
  projectId,
  workItemId,
  onClose,
}: {
  projectId: string;
  workItemId: string;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: projectQueryKeys.workItemDetail(projectId, workItemId),
    queryFn: () => getWorkItemDetail(projectId, workItemId),
  });
  const commentsQuery = useQuery({
    queryKey: projectQueryKeys.workItemComments(projectId, workItemId),
    queryFn: () => getWorkItemComments(projectId, workItemId),
  });
  const auditQuery = useQuery({
    queryKey: projectQueryKeys.workItemTimeline(projectId, workItemId),
    queryFn: () => getWorkItemTimeline(projectId, workItemId),
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<WorkItemPriority>('medium');
  const [commentContent, setCommentContent] = useState('');
  const [commentActorType, setCommentActorType] =
    useState<WorkItemCommentActorType>('human');
  const [commentActorName, setCommentActorName] = useState('Operator');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!detailQuery.data) {
      return;
    }

    setTitle(detailQuery.data.title);
    setDescription(detailQuery.data.description ?? '');
    setPriority(detailQuery.data.priority);
  }, [detailQuery.data]);

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.workItemDetail(projectId, workItemId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.workItemComments(projectId, workItemId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.workItemTimeline(projectId, workItemId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.board(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.planningHierarchy(projectId),
      }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      updateWorkItem(projectId, workItemId, {
        title: title.trim(),
        description: description.trim().length > 0 ? description.trim() : null,
        priority,
      }),
    onSuccess: async () => {
      setErrorMessage(null);
      await refreshAll();
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save work item changes.');
    },
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      createWorkItemComment(projectId, workItemId, {
        content: commentContent.trim(),
        actorType: commentActorType,
        actorName: commentActorName.trim() || undefined,
      }),
    onSuccess: async () => {
      setErrorMessage(null);
      setCommentContent('');
      await refreshAll();
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create comment.');
    },
  });

  const criterionMutation = useMutation({
    mutationFn: ({ criterionId, isComplete, text }: { criterionId: string; isComplete: boolean; text: string }) =>
      updateAcceptanceCriterion(projectId, criterionId, {
        isComplete,
        text,
      }),
    onSuccess: async () => {
      setErrorMessage(null);
      await refreshAll();
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update acceptance criterion.');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex bg-zinc-950/60">
      <div className="ml-auto h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-800/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Work item detail
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Inspect workflow state, dependencies, comments, and the full timeline.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            aria-label="Close work item detail"
          >
            ×
          </button>
        </div>

        {detailQuery.isLoading ? (
          <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Loading work item detail…</p>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {detailQuery.data ? (
          <div className="mt-6 space-y-6">
            <section className="space-y-3 rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem]">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Title</p>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Priority</p>
                  <Select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as WorkItemPriority)}
                  >
                    {priorityOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatLabel(option)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Description</p>
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>State: {formatLabel(detailQuery.data.state)}</span>
                <span>Epic: {detailQuery.data.epicTitle}</span>
                <span>Parent: {detailQuery.data.parentTitle ?? 'None'}</span>
              </div>
              <Button
                disabled={saveMutation.isPending || title.trim().length === 0}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save work item'}
              </Button>
            </section>

            <section className="space-y-3 rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Acceptance criteria</h3>
              {detailQuery.data.acceptanceCriteria.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No acceptance criteria stored yet.</p>
              ) : (
                detailQuery.data.acceptanceCriteria.map((criterion) => (
                  <label
                    key={criterion.id}
                    className="flex items-start gap-3 rounded-xl border border-zinc-800/10 px-3 py-2 text-sm text-zinc-700 dark:border-white/10 dark:text-zinc-300"
                  >
                    <input
                      checked={criterion.isComplete}
                      type="checkbox"
                      onChange={(event) =>
                        criterionMutation.mutate({
                          criterionId: criterion.id,
                          isComplete: event.target.checked,
                          text: criterion.text,
                        })
                      }
                    />
                    <span>{criterion.text}</span>
                  </label>
                ))
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Dependency summary</h3>
              {detailQuery.data.dependencyTitles.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No dependencies linked to this work item.</p>
              ) : (
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {detailQuery.data.dependencyTitles.map((titleValue, index) => (
                    <li key={`${detailQuery.data.dependencyIds[index]}-${titleValue}`}>{titleValue}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Comments</h3>
              <div className="grid gap-3 lg:grid-cols-[10rem_minmax(0,1fr)]">
                <Select
                  value={commentActorType}
                  onChange={(event) =>
                    setCommentActorType(event.target.value as WorkItemCommentActorType)
                  }
                >
                  {actorTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatLabel(option)}
                    </option>
                  ))}
                </Select>
                <Input
                  value={commentActorName}
                  onChange={(event) => setCommentActorName(event.target.value)}
                  placeholder="Actor name"
                />
              </div>
              <Textarea
                value={commentContent}
                onChange={(event) => setCommentContent(event.target.value)}
                placeholder="Add context, reviewer feedback, or agent notes."
              />
              <Button
                disabled={commentMutation.isPending || commentContent.trim().length === 0}
                onClick={() => commentMutation.mutate()}
              >
                {commentMutation.isPending ? 'Posting…' : 'Post comment'}
              </Button>
              {commentsQuery.data?.items.length ? (
                <ul className="space-y-3">
                  {commentsQuery.data.items.map((comment) => (
                    <li key={comment.id} className="rounded-xl border border-zinc-800/10 p-3 dark:border-white/10">
                      <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{comment.actorName}</span>
                        <span>{formatLabel(comment.actorType)}</span>
                        <span>{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                        {comment.content}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No comments yet.</p>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Timeline</h3>
              {auditQuery.data?.items.length ? (
                <ul className="space-y-3">
                  {auditQuery.data.items.map((item) => (
                    <li key={`${item.type}-${item.id}`} className="rounded-xl border border-zinc-800/10 p-3 dark:border-white/10">
                      <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{formatTimelineTypeLabel(item)}</span>
                        <span>{item.actorName}</span>
                        <span>{formatLabel(item.actorType)}</span>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{item.summary}</p>
                      {renderTimelineDetails(item).map((detail) => (
                        <p key={detail} className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {detail}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No timeline activity yet.</p>
              )}
            </section>

            <section className="space-y-2 rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Retry and intervention summary</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Runtime retries, merge conflict retries, and intervention cases land in later slices. This panel keeps the durable slot stable now.
              </p>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
};
