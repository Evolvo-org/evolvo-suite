'use client';

import {
  approveDevelopmentPlan,
  activateDevelopmentPlanVersion,
  authQueryKeys,
  createDevelopmentPlan,
  getDevelopmentPlan,
  getCurrentUser,
  getProductSpec,
  getProjectDetail,
  listDevelopmentPlanApprovalAudit,
  listDevelopmentPlanVersions,
  projectQueryKeys,
  updateDevelopmentPlan,
} from '@repo/api-client';
import { Badge } from '@repo/ui/components/badge/badge';
import { Button } from '@repo/ui/components/button/button';
import { Card } from '@repo/ui/components/card/card';
import { Input } from '@repo/ui/components/input/input';
import { Select } from '@repo/ui/components/select/select';
import { Tabs } from '@repo/ui/components/tabs/tabs';
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

const formatApprovalTimestamp = (timestamp: string | null): string | null => {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp).toLocaleString();
};

const generatePlanDraft = (
  projectName: string,
  productSpec: string | null,
): { title: string; content: string } => {
  const normalizedProjectName = projectName.trim() || 'Project';
  const source =
    productSpec?.trim() || 'No product specification was available.';

  return {
    title: `${normalizedProjectName} development plan`,
    content: `# ${normalizedProjectName} development plan

## Product context
${source}

## Phase 1 — Foundation
- Confirm repository and environment setup
- Validate product scope and delivery constraints
- Lock the first thin vertical slice

## Phase 2 — Operator workflows
- Implement the next operator-facing editing flow
- Add the minimum backend support required for durability
- Validate the path with end-to-end checks

## Phase 3 — Hardening
- Add observability and workflow guardrails
- Reduce manual steps for operators
- Prepare the next backlog slice

## Risks and open questions
- Capture unclear product areas for operator review
- Track integration dependencies before expanding scope
`,
  };
};

export const DevelopmentPlanEditorPanel = ({
  projectId,
}: {
  projectId: string;
}) => {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [approvalActorName, setApprovalActorName] = useState('');
  const [approvalSummary, setApprovalSummary] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => getProjectDetail(projectId),
  });
  const productSpecQuery = useQuery({
    queryKey: projectQueryKeys.productSpec(projectId),
    queryFn: () => getProductSpec(projectId),
  });
  const currentUserQuery = useQuery({
    queryKey: authQueryKeys.currentUser,
    queryFn: () => getCurrentUser(),
  });
  const planQuery = useQuery({
    queryKey: projectQueryKeys.developmentPlan(projectId),
    queryFn: () => getDevelopmentPlan(projectId),
  });
  const versionsQuery = useQuery({
    queryKey: projectQueryKeys.developmentPlanVersions(projectId),
    queryFn: () => listDevelopmentPlanVersions(projectId),
  });
  const approvalAuditQuery = useQuery({
    queryKey: projectQueryKeys.developmentPlanApprovals(projectId),
    queryFn: () => listDevelopmentPlanApprovalAudit(projectId),
  });

  const activeVersionId = planQuery.data?.activeVersionId ?? '';
  const activePlanTitle =
    planQuery.data?.title ??
    (projectQuery.data ? `${projectQuery.data.name} development plan` : '');
  const activePlanContent = planQuery.data?.activeContent ?? '';

  useEffect(() => {
    setTitle(activePlanTitle);
  }, [activePlanTitle]);

  useEffect(() => {
    setContent(activePlanContent);
  }, [activePlanContent]);

  useEffect(() => {
    setSelectedVersionId(activeVersionId);
  }, [activeVersionId]);

  useEffect(() => {
    if (approvalActorName.trim().length > 0 || !currentUserQuery.data) {
      return;
    }

    setApprovalActorName(
      currentUserQuery.data.displayName ?? currentUserQuery.data.userId,
    );
  }, [approvalActorName, currentUserQuery.data]);

  const isDirty = title !== activePlanTitle || content !== activePlanContent;
  const planningApproval = planQuery.data?.planningApproval;
  const isApprovedForActiveVersion =
    Boolean(activeVersionId) &&
    planningApproval?.isApproved === true &&
    planningApproval.approvedVersionId === activeVersionId;
  const hasApprovalDrift =
    planningApproval?.isApproved === true &&
    Boolean(activeVersionId) &&
    planningApproval.approvedVersionId !== activeVersionId;
  const approvalTimestamp = formatApprovalTimestamp(
    planningApproval?.approvedAt ?? null,
  );

  const invalidatePlanQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.developmentPlan(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.developmentPlanVersions(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.planningHierarchy(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.developmentPlanApprovals(projectId),
      }),
    ]);
  };

  const createPlanMutation = useMutation({
    mutationFn: () =>
      createDevelopmentPlan(projectId, {
        title: title.trim(),
        content: content.trim(),
      }),
    onSuccess: async () => {
      setErrorMessage(null);
      setSummary('');
      await invalidatePlanQueries();
    },
    onError: (error) => {
      const message = getErrorToastMessage(
        error,
        'Unable to create the development plan.',
      );
      setErrorMessage(message);
      pushToast({
        description: message,
        title: 'Plan creation failed',
        variant: 'error',
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: () =>
      updateDevelopmentPlan(projectId, {
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || undefined,
      }),
    onSuccess: async () => {
      setErrorMessage(null);
      setSummary('');
      await invalidatePlanQueries();
    },
    onError: (error) => {
      const message = getErrorToastMessage(
        error,
        'Unable to save the development plan.',
      );
      setErrorMessage(message);
      pushToast({
        description: message,
        title: 'Plan save failed',
        variant: 'error',
      });
    },
  });

  const activateVersionMutation = useMutation({
    mutationFn: () =>
      activateDevelopmentPlanVersion(projectId, {
        versionId: selectedVersionId,
      }),
    onSuccess: async () => {
      setErrorMessage(null);
      await invalidatePlanQueries();
    },
    onError: (error) => {
      const message = getErrorToastMessage(
        error,
        'Unable to activate the selected plan version.',
      );
      setErrorMessage(message);
      pushToast({
        description: message,
        title: 'Plan activation failed',
        variant: 'error',
      });
    },
  });

  const approvePlanMutation = useMutation({
    mutationFn: () =>
      approveDevelopmentPlan(projectId, {
        actorName: approvalActorName.trim(),
        summary: approvalSummary.trim() || undefined,
      }),
    onSuccess: async () => {
      setErrorMessage(null);
      setApprovalSummary('');
      await invalidatePlanQueries();
    },
    onError: (error) => {
      const message = getErrorToastMessage(
        error,
        'Unable to approve the active development plan version.',
      );
      setErrorMessage(message);
      pushToast({
        description: message,
        title: 'Plan approval failed',
        variant: 'error',
      });
    },
  });

  const selectedVersion = versionsQuery.data?.versions.find(
    (version) => version.id === selectedVersionId,
  );
  const canApprovePlan =
    !approvePlanMutation.isPending &&
    !createPlanMutation.isPending &&
    !updatePlanMutation.isPending &&
    !activateVersionMutation.isPending &&
    Boolean(planQuery.data?.planId) &&
    Boolean(activeVersionId) &&
    !isDirty &&
    approvalActorName.trim().length > 0;

  const approvalStatusTone = isApprovedForActiveVersion
    ? 'success'
    : hasApprovalDrift || isDirty
      ? 'warning'
      : 'neutral';

  const approvalStatusLabel = isApprovedForActiveVersion
    ? 'Approved for execution'
    : hasApprovalDrift
      ? 'Approval no longer matches the active version'
      : planQuery.data?.planId && activeVersionId
        ? 'Approval required'
        : 'No active version to approve';

  const approvalHelperText = !planQuery.data?.planId
    ? 'Create a development plan before approval is possible.'
    : !activeVersionId
      ? 'Save and activate a version before approval.'
      : isDirty
        ? 'Save the current editor changes as a new version before approving the plan.'
        : hasApprovalDrift
          ? 'A different version is currently approved. Approve the active version to clear the gate.'
          : isApprovedForActiveVersion
            ? 'This active plan version can now move from planning to ready for dev.'
            : 'The active version must be approved before workflow promotion is allowed.';

  const tabs = [
    {
      value: 'editor',
      label: 'Editor',
      content: (
        <div className="space-y-4">
          <label
            htmlFor="plan-title"
            className="block space-y-2 text-sm font-medium"
          >
            <span>Plan title</span>
            <Input
              id="plan-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Project development plan"
            />
          </label>

          <label
            htmlFor="plan-summary"
            className="block space-y-2 text-sm font-medium"
          >
            <span>Version summary</span>
            <Input
              id="plan-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Summarize what changed in this version"
            />
          </label>

          <label
            htmlFor="plan-content"
            className="block space-y-2 text-sm font-medium"
          >
            <span>Plan content</span>
            <Textarea
              id="plan-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Describe phases, milestones, and implementation sequencing."
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={
                createPlanMutation.isPending ||
                updatePlanMutation.isPending ||
                title.trim().length === 0 ||
                content.trim().length === 0 ||
                (!!planQuery.data?.planId && !isDirty)
              }
              onClick={() => {
                if (planQuery.data?.planId) {
                  updatePlanMutation.mutate();
                  return;
                }

                createPlanMutation.mutate();
              }}
            >
              {createPlanMutation.isPending || updatePlanMutation.isPending
                ? 'Saving…'
                : planQuery.data?.planId
                  ? 'Save new version'
                  : 'Create development plan'}
            </Button>
            <Button
              type="button"
              className="bg-white text-zinc-950 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
              onClick={() => {
                const generated = generatePlanDraft(
                  projectQuery.data?.name ?? 'Project',
                  productSpecQuery.data?.content ?? null,
                );
                setTitle(generated.title);
                setContent(generated.content);
              }}
            >
              Generate from product spec
            </Button>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {isDirty
                ? 'You have unsaved development plan changes.'
                : 'The editor matches the active saved plan.'}
            </span>
          </div>
        </div>
      ),
    },
    {
      value: 'versions',
      label: 'Versions',
      content: (
        <div className="space-y-4">
          <label
            htmlFor="saved-version"
            className="block space-y-2 text-sm font-medium"
          >
            <span>Saved versions</span>
            <Select
              id="saved-version"
              value={selectedVersionId}
              onChange={(event) => setSelectedVersionId(event.target.value)}
            >
              <option value="">Select a version</option>
              {versionsQuery.data?.versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.versionNumber} — {version.title}
                  {version.isActive ? ' (active)' : ''}
                </option>
              ))}
            </Select>
          </label>

          {selectedVersion ? (
            <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                v{selectedVersion.versionNumber} — {selectedVersion.title}
              </p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {selectedVersion.summary ??
                  'No summary was recorded for this version.'}
              </p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Created at{' '}
                {new Date(selectedVersion.createdAt).toLocaleString()}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  disabled={
                    activateVersionMutation.isPending ||
                    selectedVersion.isActive ||
                    selectedVersionId.length === 0
                  }
                  onClick={() => activateVersionMutation.mutate()}
                >
                  {activateVersionMutation.isPending
                    ? 'Activating…'
                    : selectedVersion.isActive
                      ? 'Active version'
                      : 'Make active'}
                </Button>
                <Button
                  type="button"
                  className="bg-white text-zinc-950 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setTitle(planQuery.data?.title ?? '');
                    setContent(planQuery.data?.activeContent ?? '');
                  }}
                >
                  Load active version into editor
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Select a saved version to inspect or activate it.
            </p>
          )}
        </div>
      ),
    },
  ];

  if (
    projectQuery.isLoading ||
    planQuery.isLoading ||
    versionsQuery.isLoading ||
    approvalAuditQuery.isLoading
  ) {
    return (
      <QueryLoadingCard
        title="Loading development plan editor"
        description="Fetching the active plan, saved versions, and supporting project data."
      />
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <QueryStateCard
        title="Development plan unavailable"
        description="The project could not be loaded. Confirm the API is available."
        onRetry={() => {
          void projectQuery.refetch();
          void planQuery.refetch();
          void versionsQuery.refetch();
          void approvalAuditQuery.refetch();
          void productSpecQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Development plan editor
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Version and activate the delivery plan for {projectQuery.data.name}.
          </p>
        </div>
        <Link
          className="text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
          href={`/projects/${projectId}`}
        >
          Back to project overview
        </Link>
      </div>

      <Card className="space-y-4 p-6" title="Plan workflow">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Save changes as new versions, switch the active version when needed,
          and generate a deterministic first draft from the current product
          specification.
        </p>
        <Tabs items={tabs} defaultValue="editor" />
      </Card>

      <Card className="space-y-4 p-6" title="Planning approval">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={approvalStatusTone}>
            <span data-cy="development-plan-approval-status">
              {approvalStatusLabel}
            </span>
          </Badge>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {planQuery.data?.activeVersionNumber
              ? `Active version v${planQuery.data.activeVersionNumber}`
              : 'No active plan version yet'}
          </span>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {approvalHelperText}
        </p>

        {planningApproval?.isApproved ? (
          <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
            <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Last approval
            </p>
            <div className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                Approved by {planningApproval.approvedBy ?? 'Unknown operator'}
                {approvalTimestamp ? ` on ${approvalTimestamp}` : ''}.
              </p>
              <p>
                Approved version:{' '}
                {planningApproval.approvedVersionId === activeVersionId
                  ? 'Current active version'
                  : planningApproval.approvedVersionId ?? 'Unknown version'}
              </p>
              <p>
                {planningApproval.summary ??
                  'No approval note was recorded for this version.'}
              </p>
            </div>
          </div>
        ) : null}

        <div
          className="grid gap-4 lg:grid-cols-2"
          data-cy="development-plan-approval-card"
        >
          <label
            htmlFor="approval-actor-name"
            className="block space-y-2 text-sm font-medium"
          >
            <span>Approver name</span>
            <Input
              id="approval-actor-name"
              value={approvalActorName}
              onChange={(event) => setApprovalActorName(event.target.value)}
              placeholder="Operator name"
            />
          </label>

          <label
            htmlFor="approval-summary"
            className="block space-y-2 text-sm font-medium"
          >
            <span>Approval note</span>
            <Input
              id="approval-summary"
              value={approvalSummary}
              onChange={(event) => setApprovalSummary(event.target.value)}
              placeholder="Optional note about why this plan is approved"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            data-cy="development-plan-approve-button"
            disabled={!canApprovePlan}
            onClick={() => approvePlanMutation.mutate()}
          >
            {approvePlanMutation.isPending
              ? 'Approving…'
              : isApprovedForActiveVersion
                ? 'Re-approve active version'
                : 'Approve active version'}
          </Button>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Approval writes an audit record and unlocks promotion into ready for dev.
          </span>
        </div>

        <div className="rounded-2xl border border-zinc-800/10 p-4 dark:border-white/10">
          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Approval history
          </p>
          {approvalAuditQuery.data?.items.length ? (
            <ul className="mt-3 space-y-3">
              {approvalAuditQuery.data.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-zinc-800/10 p-3 dark:border-white/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                      {item.action === 'reset'
                        ? `Approval reset by ${item.actorName}`
                        : `Approved by ${item.actorName}`}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {item.planVersionNumber
                      ? `Version v${item.planVersionNumber}`
                      : 'Unknown version'}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {item.summary ??
                      (item.action === 'reset'
                        ? 'No reset note was recorded for this event.'
                        : 'No approval note was recorded for this event.')}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              No approval events have been recorded yet.
            </p>
          )}
        </div>
      </Card>

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      ) : null}
    </div>
  );
};
