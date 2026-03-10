'use client';

import {
  createAcceptanceCriterion,
  createEpic,
  createWorkItem,
  deleteAcceptanceCriterion,
  deleteEpic,
  deleteWorkItem,
  getPlanningHierarchy,
  getProjectDetail,
  projectQueryKeys,
  updateAcceptanceCriterion,
  updateEpic,
  updateWorkItem,
  updateWorkItemDependencies,
  updateWorkItemPriority,
} from '@repo/api-client';
import type {
  AcceptanceCriterionItem,
  EpicNode,
  MutationResponse,
  PlanningHierarchyResponse,
  WorkItemNode,
  WorkItemPriority,
} from '@repo/shared';
import { Button } from '@repo/ui/components/button/button';
import { Card } from '@repo/ui/components/card/card';
import { Input } from '@repo/ui/components/input/input';
import { Select } from '@repo/ui/components/select/select';
import { Textarea } from '@repo/ui/components/textarea/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  QueryEmptyCard,
  QueryLoadingCard,
  QueryStateCard,
} from '../../feedback/components/query-state-card';
import {
  getErrorToastMessage,
  useToast,
} from '../../feedback/components/toast-provider';

type HierarchyMutationFactory = () => Promise<
  MutationResponse<PlanningHierarchyResponse>
>;

type WorkItemOption = {
  id: string;
  label: string;
};

const priorityOptions: ReadonlyArray<WorkItemPriority> = [
  'low',
  'medium',
  'high',
  'urgent',
];

const buildWorkItemOptions = (
  hierarchy: PlanningHierarchyResponse | undefined,
): WorkItemOption[] => {
  if (!hierarchy) {
    return [];
  }

  const flatten = (items: WorkItemNode[], epicTitle: string): WorkItemOption[] =>
    items.flatMap((item) => [
      {
        id: item.id,
        label: `${epicTitle} · ${item.kind === 'subtask' ? 'Subtask' : 'Task'} · ${item.title}`,
      },
      ...flatten(item.children, epicTitle),
    ]);

  return hierarchy.epics.flatMap((epic) => flatten(epic.tasks, epic.title));
};

const formatPriorityLabel = (priority: WorkItemPriority): string => {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

export const PlanningHierarchyPanel = ({
  projectId,
}: {
  projectId: string;
}) => {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const projectQuery = useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => getProjectDetail(projectId),
  });
  const hierarchyQuery = useQuery({
    queryKey: projectQueryKeys.planningHierarchy(projectId),
    queryFn: () => getPlanningHierarchy(projectId),
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newEpicTitle, setNewEpicTitle] = useState('');
  const [newEpicSummary, setNewEpicSummary] = useState('');

  const hierarchyMutation = useMutation({
    mutationFn: (factory: HierarchyMutationFactory) => factory(),
    onSuccess: async (response) => {
      setErrorMessage(null);
      queryClient.setQueryData(
        projectQueryKeys.planningHierarchy(projectId),
        response.data,
      );
      await queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(projectId),
      });
    },
    onError: (error) => {
      const message = getErrorToastMessage(
        error,
        'Unable to save planning hierarchy changes.',
      );
      setErrorMessage(message);
      pushToast({
        description: message,
        title: 'Planning change failed',
        variant: 'error',
      });
    },
  });

  const workItemOptions = useMemo(
    () => buildWorkItemOptions(hierarchyQuery.data),
    [hierarchyQuery.data],
  );

  if (projectQuery.isLoading || hierarchyQuery.isLoading) {
    return (
      <QueryLoadingCard
        title="Loading planning hierarchy"
        description="Fetching the current epic, task, and subtask structure from the API."
      />
    );
  }

  if (
    projectQuery.isError ||
    hierarchyQuery.isError ||
    !projectQuery.data ||
    !hierarchyQuery.data
  ) {
    return (
      <QueryStateCard
        title="Planning hierarchy unavailable"
        description="The planning hierarchy could not be loaded. Confirm the API is running and the project still exists."
        onRetry={() => {
          void projectQuery.refetch();
          void hierarchyQuery.refetch();
        }}
      />
    );
  }

  const hierarchy = hierarchyQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Planning hierarchy for {projectQuery.data.name}
          </h1>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Decompose the active plan into durable epics, tasks, and subtasks.
            Structure stays separate from workflow state, so this view focuses on
            planning detail only.
          </p>
        </div>
        <Link
          className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
          href={`/projects/${projectId}`}
        >
          Back to project overview
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-2 p-6" title="Hierarchy summary">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Epics: {hierarchy.epics.length}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Work items: {hierarchy.workItemCount}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Acceptance criteria: {hierarchy.acceptanceCriteriaCount}
          </p>
        </Card>

        <Card className="space-y-2 p-6 xl:col-span-2" title="Create epic">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-3">
              <Input
                value={newEpicTitle}
                onChange={(event) => setNewEpicTitle(event.target.value)}
                placeholder="Epic title"
              />
              <Textarea
                value={newEpicSummary}
                onChange={(event) => setNewEpicSummary(event.target.value)}
                placeholder="Epic summary, intended outcome, and operator context."
              />
            </div>
            <Button
              disabled={
                hierarchyMutation.isPending || newEpicTitle.trim().length === 0
              }
              onClick={() => {
                hierarchyMutation.mutate(() =>
                  createEpic(projectId, {
                    title: newEpicTitle.trim(),
                    summary:
                      newEpicSummary.trim().length > 0
                        ? newEpicSummary.trim()
                        : undefined,
                  }),
                );
                setNewEpicTitle('');
                setNewEpicSummary('');
              }}
            >
              {hierarchyMutation.isPending ? 'Saving…' : 'Create epic'}
            </Button>
          </div>
        </Card>
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      ) : null}

      <div className="space-y-4">
        {hierarchy.epics.length === 0 ? (
          <QueryEmptyCard
            title="No epics yet"
            description="Start by creating the first epic for this project. Tasks and subtasks attach underneath each epic."
          />
        ) : null}

        {hierarchy.epics.map((epic) => (
          <EpicSection
            key={epic.id}
            epic={epic}
            isPending={hierarchyMutation.isPending}
            projectId={projectId}
            workItemOptions={workItemOptions}
            onMutate={hierarchyMutation.mutate}
          />
        ))}
      </div>
    </div>
  );
};

const EpicSection = ({
  epic,
  projectId,
  workItemOptions,
  isPending,
  onMutate,
}: {
  epic: EpicNode;
  projectId: string;
  workItemOptions: WorkItemOption[];
  isPending: boolean;
  onMutate: (factory: HierarchyMutationFactory) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [title, setTitle] = useState(epic.title);
  const [summary, setSummary] = useState(epic.summary ?? '');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  useEffect(() => {
    setTitle(epic.title);
    setSummary(epic.summary ?? '');
  }, [epic.title, epic.summary]);

  return (
    <Card className="space-y-4 p-6" title={epic.title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {epic.tasks.length} top-level task{epic.tasks.length === 1 ? '' : 's'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsExpanded((value) => !value)}>
            {isExpanded ? 'Collapse epic' : 'Expand epic'}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-500 dark:bg-red-500 dark:text-white dark:hover:bg-red-400"
            disabled={isPending}
            onClick={() => onMutate(() => deleteEpic(projectId, epic.id))}
          >
            Delete epic
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div className="space-y-6">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                Epic title
              </p>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                Epic summary
              </p>
              <Textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
            </div>
          </div>

          <Button
            disabled={isPending || title.trim().length === 0}
            onClick={() =>
              onMutate(() =>
                updateEpic(projectId, epic.id, {
                  title: title.trim(),
                  summary: summary.trim().length > 0 ? summary.trim() : null,
                }),
              )
            }
          >
            Save epic details
          </Button>

          <div className="space-y-3 rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
            <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Add task
            </p>
            <Input
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder="Task title"
            />
            <Textarea
              value={newTaskDescription}
              onChange={(event) => setNewTaskDescription(event.target.value)}
              placeholder="Task implementation notes, intended outcome, and constraints."
            />
            <Button
              disabled={isPending || newTaskTitle.trim().length === 0}
              onClick={() => {
                onMutate(() =>
                  createWorkItem(projectId, {
                    epicId: epic.id,
                    kind: 'task',
                    title: newTaskTitle.trim(),
                    description:
                      newTaskDescription.trim().length > 0
                        ? newTaskDescription.trim()
                        : undefined,
                  }),
                );
                setNewTaskTitle('');
                setNewTaskDescription('');
              }}
            >
              Create task
            </Button>
          </div>

          <div className="space-y-4">
            {epic.tasks.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No tasks yet for this epic.
              </p>
            ) : (
              epic.tasks.map((task) => (
                <WorkItemSection
                  key={task.id}
                  isPending={isPending}
                  item={task}
                  level={0}
                  projectId={projectId}
                  workItemOptions={workItemOptions}
                  onMutate={onMutate}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
};

const WorkItemSection = ({
  item,
  projectId,
  workItemOptions,
  onMutate,
  isPending,
  level,
}: {
  item: WorkItemNode;
  projectId: string;
  workItemOptions: WorkItemOption[];
  onMutate: (factory: HierarchyMutationFactory) => void;
  isPending: boolean;
  level: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? '');
  const [priority, setPriority] = useState<WorkItemPriority>(item.priority);
  const [dependencyIds, setDependencyIds] = useState<string[]>(item.dependencyIds);
  const [newCriterion, setNewCriterion] = useState('');
  const [criterionDrafts, setCriterionDrafts] = useState<
    Record<string, AcceptanceCriterionItem>
  >({});
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('');

  useEffect(() => {
    setTitle(item.title);
    setDescription(item.description ?? '');
    setPriority(item.priority);
    setDependencyIds(item.dependencyIds);
    setCriterionDrafts(
      Object.fromEntries(
        item.acceptanceCriteria.map((criterion) => [criterion.id, criterion]),
      ),
    );
  }, [item]);

  const availableDependencies = workItemOptions.filter(
    (option) => option.id !== item.id,
  );

  const containerClassName =
    level === 0
      ? 'space-y-4 rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10'
      : 'space-y-4 rounded-2xl border border-zinc-800/10 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950/40';

  return (
    <div className={containerClassName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {item.kind}
          </p>
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {item.title}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsExpanded((value) => !value)}>
            {isExpanded ? 'Collapse item' : 'Expand item'}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-500 dark:bg-red-500 dark:text-white dark:hover:bg-red-400"
            disabled={isPending}
            onClick={() => onMutate(() => deleteWorkItem(projectId, item.id))}
          >
            Delete {item.kind}
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                Title
              </p>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                Priority
              </p>
              <Select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as WorkItemPriority)
                }
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatPriorityLabel(option)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
              Description
            </p>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isPending || title.trim().length === 0}
              onClick={() =>
                onMutate(() =>
                  updateWorkItem(projectId, item.id, {
                    title: title.trim(),
                    description:
                      description.trim().length > 0 ? description.trim() : null,
                  }),
                )
              }
            >
              Save details
            </Button>
            <Button
              disabled={isPending}
              onClick={() =>
                onMutate(() =>
                  updateWorkItemPriority(projectId, item.id, { priority }),
                )
              }
            >
              Save priority
            </Button>
          </div>

          <div className="space-y-3 rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
            <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Dependencies
            </p>
            {availableDependencies.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No other work items exist yet.
              </p>
            ) : (
              <div className="grid gap-2 lg:grid-cols-2">
                {availableDependencies.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-start gap-2 rounded-xl border border-zinc-800/10 px-3 py-2 text-sm text-zinc-700 dark:border-white/10 dark:text-zinc-300"
                  >
                    <input
                      checked={dependencyIds.includes(option.id)}
                      className="mt-1"
                      type="checkbox"
                      onChange={(event) => {
                        setDependencyIds((current) =>
                          event.target.checked
                            ? [...current, option.id]
                            : current.filter((value) => value !== option.id),
                        );
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            )}
            <Button
              disabled={isPending}
              onClick={() =>
                onMutate(() =>
                  updateWorkItemDependencies(projectId, item.id, {
                    dependencyIds,
                  }),
                )
              }
            >
              Save dependencies
            </Button>
          </div>

          <div className="space-y-3 rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
            <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Acceptance criteria
            </p>
            <div className="space-y-3">
              {item.acceptanceCriteria.map((criterion) => {
                const draft = criterionDrafts[criterion.id] ?? criterion;

                return (
                  <div
                    key={criterion.id}
                    className="space-y-3 rounded-xl border border-zinc-800/10 p-3 dark:border-white/10"
                  >
                    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <input
                        checked={draft.isComplete}
                        type="checkbox"
                        onChange={(event) =>
                          setCriterionDrafts((current) => ({
                            ...current,
                            [criterion.id]: {
                              ...draft,
                              isComplete: event.target.checked,
                            },
                          }))
                        }
                      />
                      Complete
                    </label>
                    <Input
                      value={draft.text}
                      onChange={(event) =>
                        setCriterionDrafts((current) => ({
                          ...current,
                          [criterion.id]: {
                            ...draft,
                            text: event.target.value,
                          },
                        }))
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={isPending || draft.text.trim().length === 0}
                        onClick={() =>
                          onMutate(() =>
                            updateAcceptanceCriterion(projectId, criterion.id, {
                              text: draft.text.trim(),
                              isComplete: draft.isComplete,
                            }),
                          )
                        }
                      >
                        Save criterion
                      </Button>
                      <Button
                        className="bg-red-600 hover:bg-red-500 dark:bg-red-500 dark:text-white dark:hover:bg-red-400"
                        disabled={isPending}
                        onClick={() =>
                          onMutate(() =>
                            deleteAcceptanceCriterion(projectId, criterion.id),
                          )
                        }
                      >
                        Delete criterion
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 lg:flex-row">
              <Input
                value={newCriterion}
                onChange={(event) => setNewCriterion(event.target.value)}
                placeholder="Add a new acceptance criterion"
              />
              <Button
                disabled={isPending || newCriterion.trim().length === 0}
                onClick={() => {
                  onMutate(() =>
                    createAcceptanceCriterion(projectId, item.id, {
                      text: newCriterion.trim(),
                    }),
                  );
                  setNewCriterion('');
                }}
              >
                Add criterion
              </Button>
            </div>
          </div>

          {item.kind === 'task' ? (
            <div className="space-y-3 rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Add subtask
              </p>
              <Input
                value={newSubtaskTitle}
                onChange={(event) => setNewSubtaskTitle(event.target.value)}
                placeholder="Subtask title"
              />
              <Textarea
                value={newSubtaskDescription}
                onChange={(event) =>
                  setNewSubtaskDescription(event.target.value)
                }
                placeholder="Subtask implementation details"
              />
              <Button
                disabled={isPending || newSubtaskTitle.trim().length === 0}
                onClick={() => {
                  onMutate(() =>
                    createWorkItem(projectId, {
                      epicId: item.epicId,
                      parentId: item.id,
                      kind: 'subtask',
                      title: newSubtaskTitle.trim(),
                      description:
                        newSubtaskDescription.trim().length > 0
                          ? newSubtaskDescription.trim()
                          : undefined,
                    }),
                  );
                  setNewSubtaskTitle('');
                  setNewSubtaskDescription('');
                }}
              >
                Create subtask
              </Button>
            </div>
          ) : null}

          {item.children.length > 0 ? (
            <div className="space-y-3 pl-4 lg:pl-6">
              {item.children.map((child) => (
                <WorkItemSection
                  key={child.id}
                  isPending={isPending}
                  item={child}
                  level={level + 1}
                  projectId={projectId}
                  workItemOptions={workItemOptions}
                  onMutate={onMutate}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
