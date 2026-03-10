'use client';

import {
  getProductSpec,
  projectQueryKeys,
  upsertProductSpec,
} from '@repo/api-client';
import { Button } from '@repo/ui/components/button/button';
import { Textarea } from '@repo/ui/components/textarea/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import {
  getErrorToastMessage,
  useToast,
} from '../../feedback/components/toast-provider';

export const ProductSpecEditor = ({ projectId }: { projectId: string }) => {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const productSpecQuery = useQuery({
    queryKey: projectQueryKeys.productSpec(projectId),
    queryFn: () => getProductSpec(projectId),
  });
  const [draft, setDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const persistedContent = productSpecQuery.data?.content ?? '';
  const isDirty = draft !== persistedContent;
  const versionLabel = useMemo(() => {
    if (!productSpecQuery.data?.version) {
      return 'No saved version yet';
    }

    return `Version ${productSpecQuery.data.version}`;
  }, [productSpecQuery.data?.version]);

  useEffect(() => {
    if (!isDirty) {
      setDraft(persistedContent);
    }
  }, [isDirty, persistedContent]);

  const saveMutation = useMutation({
    mutationFn: (content: string) =>
      upsertProductSpec(projectId, {
        content,
      }),
    onSuccess: async (response) => {
      setErrorMessage(null);
      queryClient.setQueryData(
        projectQueryKeys.productSpec(projectId),
        response.data,
      );
      await queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(projectId),
      });
      setDraft(response.data.content ?? '');
    },
    onError: (error) => {
      const message = getErrorToastMessage(
        error,
        'Unable to save the product specification.',
      );
      setErrorMessage(message);
      pushToast({
        description: message,
        title: 'Specification save failed',
        variant: 'error',
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
            {versionLabel}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isDirty
              ? 'You have unsaved product specification changes.'
              : 'Edits are saved back through the API only.'}
          </p>
        </div>
        <Button
          type="button"
          disabled={
            saveMutation.isPending || !isDirty || draft.trim().length === 0
          }
          onClick={() => saveMutation.mutate(draft.trim())}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save specification'}
        </Button>
      </div>

      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Describe the product goals, scope, constraints, and operator outcomes."
      />

      {productSpecQuery.isLoading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Loading product specification…
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      ) : null}
    </div>
  );
};
