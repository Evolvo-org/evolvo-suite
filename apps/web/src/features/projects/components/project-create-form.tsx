'use client';

import {
  createProject,
  getSystemQueueLimits,
  projectQueryKeys,
  settingsQueryKeys,
} from '@repo/api-client';
import { defaultProjectQueueLimits } from '@repo/shared';
import type { ProjectQueueLimits } from '@repo/shared';
import { Card } from '@repo/ui/components/card/card';
import { Input } from '@repo/ui/components/input/input';
import { Textarea } from '@repo/ui/components/textarea/textarea';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

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

const readQueueLimits = (
  formData: FormData,
  defaults: ProjectQueueLimits,
): ProjectQueueLimits => {
  return queueLimitFields.reduce<ProjectQueueLimits>(
    (accumulator, [fieldName]) => {
      accumulator[fieldName] = Number(
        formData.get(fieldName) ?? defaults[fieldName],
      );
      return accumulator;
    },
    { ...defaults },
  );
};

const areQueueLimitsEqual = (
  left: ProjectQueueLimits,
  right: ProjectQueueLimits,
): boolean => {
  return queueLimitFields.every(
    ([fieldName]) => left[fieldName] === right[fieldName],
  );
};

export const ProjectCreateForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const systemQueueLimitsQuery = useQuery({
    queryKey: settingsQueryKeys.systemQueueLimits(),
    queryFn: () => getSystemQueueLimits(),
  });

  const defaultQueueState = useMemo(
    () => ({
      ...(systemQueueLimitsQuery.data?.queueLimits ?? defaultProjectQueueLimits),
    }),
    [systemQueueLimitsQuery.data?.queueLimits],
  );

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      router.push(`/projects/${response.data.id}`);
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create project.',
      );
    },
  });

  return (
    <Card className="p-6" title="Create project">
      <form
        className="space-y-8"
        onSubmit={(event) => {
          event.preventDefault();
          setErrorMessage(null);

          const formData = new FormData(event.currentTarget);
          const owner = String(formData.get('repositoryOwner') ?? '').trim();
          const repoName = String(formData.get('repositoryName') ?? '').trim();
          const repositoryUrlValue = String(
            formData.get('repositoryUrl') ?? '',
          ).trim();
          const queueLimits = readQueueLimits(formData, defaultQueueState);

          createProjectMutation.mutate({
            name: String(formData.get('name') ?? '').trim(),
            productDescription: String(
              formData.get('productDescription') ?? '',
            ).trim(),
            developmentPlan:
              String(formData.get('developmentPlan') ?? '').trim() || undefined,
            repository: {
              provider: 'github',
              owner,
              name: repoName,
              url:
                repositoryUrlValue || `https://github.com/${owner}/${repoName}`,
              defaultBranch: String(
                formData.get('defaultBranch') ?? 'main',
              ).trim(),
              baseBranch: String(formData.get('baseBranch') ?? 'main').trim(),
            },
            queueLimits: areQueueLimitsEqual(queueLimits, defaultQueueState)
              ? undefined
              : queueLimits,
          });
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label
            htmlFor="project-name"
            className="space-y-2 text-sm font-medium"
          >
            <span>Project name</span>
            <Input
              id="project-name"
              name="name"
              required
              placeholder="Evolvo v2"
            />
          </label>
          <label
            htmlFor="repository-url"
            className="space-y-2 text-sm font-medium"
          >
            <span>Repository URL</span>
            <Input
              id="repository-url"
              name="repositoryUrl"
              placeholder="https://github.com/Evolvo-org/evolvo-suite"
            />
          </label>
          <label
            htmlFor="repository-owner"
            className="space-y-2 text-sm font-medium"
          >
            <span>Repository owner</span>
            <Input
              id="repository-owner"
              name="repositoryOwner"
              required
              placeholder="Evolvo-org"
            />
          </label>
          <label
            htmlFor="repository-name"
            className="space-y-2 text-sm font-medium"
          >
            <span>Repository name</span>
            <Input
              id="repository-name"
              name="repositoryName"
              required
              placeholder="evolvo-suite"
            />
          </label>
          <label
            htmlFor="default-branch"
            className="space-y-2 text-sm font-medium"
          >
            <span>Default branch</span>
            <Input
              id="default-branch"
              name="defaultBranch"
              defaultValue="main"
              required
            />
          </label>
          <label
            htmlFor="base-branch"
            className="space-y-2 text-sm font-medium"
          >
            <span>Base branch</span>
            <Input
              id="base-branch"
              name="baseBranch"
              defaultValue="main"
              required
            />
          </label>
        </div>

        <label
          htmlFor="product-description"
          className="block space-y-2 text-sm font-medium"
        >
          <span>Product specification</span>
          <Textarea
            id="product-description"
            name="productDescription"
            required
            placeholder="Describe the product goals, scope, constraints, and operator outcomes."
          />
        </label>

        <label
          htmlFor="development-plan"
          className="block space-y-2 text-sm font-medium"
        >
          <span>Optional development plan</span>
          <Textarea
            id="development-plan"
            name="developmentPlan"
            placeholder="Paste an initial roadmap or phased delivery plan if one already exists."
          />
        </label>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Queue limits</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Defaults load from the shared system settings. Change them here
              only when this project needs an override from day one.
            </p>
          </div>
          <div
            key={JSON.stringify(defaultQueueState)}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {queueLimitFields.map(([fieldName, label]) => (
              <label
                key={fieldName}
                htmlFor={fieldName}
                className="space-y-2 text-sm font-medium"
              >
                <span>{label}</span>
                <Input
                  id={fieldName}
                  name={fieldName}
                  type="number"
                  min={0}
                  defaultValue={defaultQueueState[fieldName]}
                  required
                />
              </label>
            ))}
          </div>
        </div>

        {errorMessage ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        ) : null}

        {systemQueueLimitsQuery.isLoading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Loading system queue defaults…
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={createProjectMutation.isPending}
            className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {createProjectMutation.isPending
              ? 'Creating project…'
              : 'Create project'}
          </button>
        </div>
      </form>
    </Card>
  );
};
