'use client';

import {
  clearProjectQueueLimits,
  getProjectDetail,
  getProjectQueueLimits,
  getSystemQueueLimits,
  projectQueryKeys,
  settingsQueryKeys,
  updateProjectQueueLimits,
  updateSystemQueueLimits,
} from '@repo/api-client';
import { defaultProjectQueueLimits } from '@repo/shared';
import type { ProjectQueueLimits } from '@repo/shared';
import { Button } from '@repo/ui/components/button/button';
import { Card } from '@repo/ui/components/card/card';
import { Input } from '@repo/ui/components/input/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const queueLimitFields = [
  ['maxPlanning', 'Max planning'],
  ['maxReadyForDev', 'Max ready for dev'],
  ['maxInDev', 'Max in dev'],
  ['maxReadyForReview', 'Max ready for review'],
  ['maxInReview', 'Max in review'],
  ['maxReadyForRelease', 'Max ready for release'],
  ['maxReviewRetries', 'Max review retries'],
  ['maxMergeConflictRetries', 'Max merge conflict retries'],
  ['maxRuntimeRetries', 'Max runtime retries'],
  ['maxAmbiguityRetries', 'Max ambiguity retries'],
] as const;

const copyQueueLimits = (
  value: ProjectQueueLimits | null | undefined,
): ProjectQueueLimits => ({
  ...(value ?? defaultProjectQueueLimits),
});

const areQueueLimitsEqual = (
  left: ProjectQueueLimits,
  right: ProjectQueueLimits,
): boolean => {
  return queueLimitFields.every(
    ([fieldName]) => left[fieldName] === right[fieldName],
  );
};

const formatUpdatedAt = (value: string | null): string => {
  if (!value) {
    return 'Not saved yet';
  }

  return new Date(value).toLocaleString();
};

const QueueLimitForm = ({
  values,
  onChange,
  disabled = false,
}: {
  values: ProjectQueueLimits;
  onChange: (fieldName: keyof ProjectQueueLimits, value: number) => void;
  disabled?: boolean;
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {queueLimitFields.map(([fieldName, label]) => (
        <label
          key={fieldName}
          htmlFor={fieldName}
          className="space-y-2 text-sm font-medium"
        >
          <span>{label}</span>
          <Input
            id={fieldName}
            type="number"
            min={0}
            disabled={disabled}
            value={values[fieldName]}
            onChange={(event) =>
              onChange(fieldName, Number(event.target.value || 0))
            }
          />
        </label>
      ))}
    </div>
  );
};

export const ProjectSettingsPanel = ({ projectId }: { projectId: string }) => {
  const queryClient = useQueryClient();
  const [systemDraft, setSystemDraft] = useState<ProjectQueueLimits | null>(
    null,
  );
  const [projectDraft, setProjectDraft] = useState<ProjectQueueLimits | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => getProjectDetail(projectId),
  });
  const systemQueueLimitsQuery = useQuery({
    queryKey: settingsQueryKeys.systemQueueLimits(),
    queryFn: () => getSystemQueueLimits(),
  });
  const projectQueueLimitsQuery = useQuery({
    queryKey: projectQueryKeys.queueLimits(projectId),
    queryFn: () => getProjectQueueLimits(projectId),
  });

  const systemPersisted =
    systemQueueLimitsQuery.data?.queueLimits ?? defaultProjectQueueLimits;
  const projectPersisted =
    projectQueueLimitsQuery.data?.overrides ??
    projectQueueLimitsQuery.data?.effective ??
    systemPersisted;
  const systemQueueLimits = systemQueueLimitsQuery.data?.queueLimits;
  const projectQueueLimitsOverride = projectQueueLimitsQuery.data?.overrides;
  const projectQueueLimitsEffective = projectQueueLimitsQuery.data?.effective;

  useEffect(() => {
    if (systemQueueLimits) {
      setSystemDraft(copyQueueLimits(systemQueueLimits));
    }
  }, [systemQueueLimits]);

  useEffect(() => {
    if (projectQueueLimitsEffective) {
      setProjectDraft(
        copyQueueLimits(
          projectQueueLimitsOverride ?? projectQueueLimitsEffective,
        ),
      );
    }
  }, [projectQueueLimitsEffective, projectQueueLimitsOverride]);

  const systemValues = systemDraft ?? copyQueueLimits(systemPersisted);
  const projectValues = projectDraft ?? copyQueueLimits(projectPersisted);
  const projectHasOverrides = Boolean(projectQueueLimitsQuery.data?.overrides);

  const systemDirty = useMemo(
    () => !areQueueLimitsEqual(systemValues, systemPersisted),
    [systemPersisted, systemValues],
  );
  const projectDirty = useMemo(
    () => !areQueueLimitsEqual(projectValues, projectPersisted),
    [projectPersisted, projectValues],
  );

  const invalidateSettingsQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.queueLimits(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.systemQueueLimits(),
      }),
    ]);
  };

  const systemMutation = useMutation({
    mutationFn: (payload: ProjectQueueLimits) => updateSystemQueueLimits(payload),
    onSuccess: async (response) => {
      setErrorMessage(null);
      queryClient.setQueryData(
        settingsQueryKeys.systemQueueLimits(),
        response.data,
      );
      await invalidateSettingsQueries();
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save system queue defaults.',
      );
    },
  });

  const projectMutation = useMutation({
    mutationFn: (payload: ProjectQueueLimits) =>
      updateProjectQueueLimits(projectId, payload),
    onSuccess: async (response) => {
      setErrorMessage(null);
      queryClient.setQueryData(
        projectQueryKeys.queueLimits(projectId),
        response.data,
      );
      await invalidateSettingsQueries();
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save project queue limits.',
      );
    },
  });

  const resetProjectMutation = useMutation({
    mutationFn: () => clearProjectQueueLimits(projectId),
    onSuccess: async (response) => {
      setErrorMessage(null);
      queryClient.setQueryData(
        projectQueryKeys.queueLimits(projectId),
        response.data,
      );
      setProjectDraft(copyQueueLimits(response.data.effective));
      await invalidateSettingsQueries();
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to reset project queue limits.',
      );
    },
  });

  if (
    projectQuery.isLoading ||
    systemQueueLimitsQuery.isLoading ||
    projectQueueLimitsQuery.isLoading
  ) {
    return (
      <Card className="p-6" title="Loading settings">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Fetching queue defaults and project settings from the API.
        </p>
      </Card>
    );
  }

  if (
    projectQuery.isError ||
    systemQueueLimitsQuery.isError ||
    projectQueueLimitsQuery.isError ||
    !projectQuery.data ||
    !systemQueueLimitsQuery.data ||
    !projectQueueLimitsQuery.data
  ) {
    return (
      <Card className="p-6" title="Settings unavailable">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The settings view could not be loaded. Confirm the API is available
          and the project still exists.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Settings for {projectQuery.data.name}
          </h1>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            System defaults define the shared queue policy. Project overrides are
            optional and only needed when this delivery stream should diverge.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}`}
          >
            Back to project overview
          </Link>
          <Link
            className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
            href={`/projects/${projectId}/board`}
          >
            Open kanban board
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-3 p-6" title="Effective queue policy">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Project override: {projectHasOverrides ? 'active' : 'using system defaults'}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            System defaults updated: {formatUpdatedAt(systemQueueLimitsQuery.data.updatedAt)}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Project override updated: {formatUpdatedAt(projectQueueLimitsQuery.data.updatedAt)}
          </p>
        </Card>

        <Card className="space-y-3 p-6" title="Retry policy placeholder">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Retry thresholds already flow through the queue limits contract. This
            section reserves room for future backoff windows and intervention
            policies without changing the page shape later.
          </p>
          <Input disabled value="Backoff windows and escalation rules ship in a later API slice." />
        </Card>

        <Card className="space-y-3 p-6" title="Model and billing placeholders">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Model routing and billing guardrails stay visible now so operators
            have a stable control surface before those APIs land.
          </p>
          <Input disabled value="Model routing: default shared profile" />
          <Input disabled value="Billing visibility: admin bypass until billing APIs arrive" />
        </Card>
      </div>

      <Card className="space-y-6 p-6" title="System queue defaults">
        <div className="space-y-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Changes here become the baseline for new projects and any project
            that has not saved its own override.
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Last saved: {formatUpdatedAt(systemQueueLimitsQuery.data.updatedAt)}
          </p>
        </div>
        <QueueLimitForm
          values={systemValues}
          onChange={(fieldName, value) =>
            setSystemDraft((current) => ({
              ...(current ?? copyQueueLimits(systemPersisted)),
              [fieldName]: value,
            }))
          }
          disabled={systemMutation.isPending}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => systemMutation.mutate(systemValues)}
            disabled={systemMutation.isPending || !systemDirty}
          >
            {systemMutation.isPending ? 'Saving…' : 'Save system defaults'}
          </Button>
          <Button
            className="bg-white text-zinc-950 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
            onClick={() => setSystemDraft(copyQueueLimits(systemPersisted))}
            disabled={systemMutation.isPending || !systemDirty}
          >
            Reset draft
          </Button>
        </div>
      </Card>

      <Card className="space-y-6 p-6" title="Project queue override">
        <div className="space-y-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Keep this aligned with system defaults unless the project needs a
            narrower or wider flow-control policy.
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Current mode: {projectHasOverrides ? 'Override saved' : 'Using system defaults'}
          </p>
        </div>
        <QueueLimitForm
          values={projectValues}
          onChange={(fieldName, value) =>
            setProjectDraft((current) => ({
              ...(current ?? copyQueueLimits(projectPersisted)),
              [fieldName]: value,
            }))
          }
          disabled={projectMutation.isPending || resetProjectMutation.isPending}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => projectMutation.mutate(projectValues)}
            disabled={
              projectMutation.isPending ||
              resetProjectMutation.isPending ||
              !projectDirty
            }
          >
            {projectMutation.isPending ? 'Saving…' : 'Save project override'}
          </Button>
          <Button
            className="bg-white text-zinc-950 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
            onClick={() => setProjectDraft(copyQueueLimits(systemPersisted))}
            disabled={projectMutation.isPending || resetProjectMutation.isPending}
          >
            Copy system defaults
          </Button>
          <Button
            className="bg-white text-zinc-950 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
            onClick={() => resetProjectMutation.mutate()}
            disabled={
              projectMutation.isPending ||
              resetProjectMutation.isPending ||
              !projectHasOverrides
            }
          >
            {resetProjectMutation.isPending ? 'Resetting…' : 'Use system defaults'}
          </Button>
        </div>
      </Card>

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      ) : null}
    </div>
  );
};
