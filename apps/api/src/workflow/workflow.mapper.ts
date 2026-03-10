import type {
  AgentDecision,
  AgentFailure,
  AgentRun,
  AgentRunArtifact,
  ReviewGateCheck,
  ReviewGateResult,
  WorkItem,
  WorkItemComment,
  WorkItemStateTransition,
} from '@repo/db/client';
import type {
  KanbanBoardCard,
  KanbanBoardCounts,
  KanbanBoardResponse,
  WorkItemAuditEvent,
  WorkItemAuditTrailResponse,
  WorkItemCommentsResponse,
  WorkItemDetailResponse,
  WorkItemState,
} from '@repo/shared';

const workflowLabelMap: Record<WorkItemState, string> = {
  planning: 'Planning',
  readyForDev: 'Ready for dev',
  inDev: 'In dev',
  readyForReview: 'Ready for review',
  inReview: 'In review',
  readyForRelease: 'Ready for release',
  requiresHumanIntervention: 'Requires human intervention',
  released: 'Released',
};

export const mapWorkflowState = (value: WorkItem['state']): WorkItemState => {
  switch (value) {
    case 'PLANNING':
      return 'planning';
    case 'READY_FOR_DEV':
      return 'readyForDev';
    case 'IN_DEV':
      return 'inDev';
    case 'READY_FOR_REVIEW':
      return 'readyForReview';
    case 'IN_REVIEW':
      return 'inReview';
    case 'READY_FOR_RELEASE':
      return 'readyForRelease';
    case 'REQUIRES_HUMAN_INTERVENTION':
      return 'requiresHumanIntervention';
    case 'RELEASED':
      return 'released';
    default:
      return 'planning';
  }
};

export const mapWorkflowPriority = (
  value: WorkItem['priority'],
): KanbanBoardCard['priority'] => {
  switch (value) {
    case 'LOW':
      return 'low';
    case 'HIGH':
      return 'high';
    case 'URGENT':
      return 'urgent';
    default:
      return 'medium';
  }
};

export const createEmptyBoardCounts = (): KanbanBoardCounts => ({
  planning: 0,
  readyForDev: 0,
  inDev: 0,
  readyForReview: 0,
  inReview: 0,
  readyForRelease: 0,
  requiresHumanIntervention: 0,
  released: 0,
});

export const mapBoardCard = (
  item: WorkItem & {
    epic: { title: string };
    dependencies: Array<{ dependsOnWorkItemId: string }>;
    acceptanceCriteria: Array<{ isComplete: boolean }>;
  },
): KanbanBoardCard => ({
  id: item.id,
  epicId: item.epicId,
  epicTitle: item.epic.title,
  parentId: item.parentId,
  kind: item.kind === 'SUBTASK' ? 'subtask' : 'task',
  title: item.title,
  description: item.description,
  state: mapWorkflowState(item.state),
  priority: mapWorkflowPriority(item.priority),
  dependencyIds: item.dependencies.map(
    (dependency) => dependency.dependsOnWorkItemId,
  ),
  acceptanceCriteriaCount: item.acceptanceCriteria.length,
  completedAcceptanceCriteriaCount: item.acceptanceCriteria.filter(
    (criterion) => criterion.isComplete,
  ).length,
  updatedAt: item.updatedAt.toISOString(),
});

export const mapBoardResponse = (
  projectId: string,
  cards: KanbanBoardCard[],
): KanbanBoardResponse => {
  const counts = createEmptyBoardCounts();

  for (const card of cards) {
    counts[card.state] += 1;
  }

  return {
    projectId,
    columns: Object.entries(workflowLabelMap).map(([state, label]) => ({
      state: state as WorkItemState,
      label,
      items: cards.filter((card) => card.state === state),
    })),
    counts,
  };
};

const mapCommentActorType = (
  value: WorkItemComment['actorType'],
): 'human' | 'agent' | 'system' => {
  switch (value) {
    case 'AGENT':
      return 'agent';
    case 'SYSTEM':
      return 'system';
    default:
      return 'human';
  }
};

const mapAgentRunStatus = (
  value: AgentRun['status'],
): 'running' | 'completed' | 'failed' | 'cancelled' => {
  switch (value) {
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'running';
  }
};

const mapReviewGateOverallStatus = (
  value: ReviewGateResult['overallStatus'],
): 'passed' | 'failed' => {
  switch (value) {
    case 'FAILED':
      return 'failed';
    default:
      return 'passed';
  }
};

const formatAgentTypeLabel = (value: string): string => {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase())
    .trim();
};

export const mapWorkItemCommentsResponse = (
  projectId: string,
  workItemId: string,
  comments: WorkItemComment[],
): WorkItemCommentsResponse => ({
  projectId,
  workItemId,
  items: comments.map((comment) => ({
    id: comment.id,
    workItemId: comment.workItemId,
    actorType: mapCommentActorType(comment.actorType),
    actorName: comment.actorName,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  })),
});

export const mapWorkItemDetail = (
  projectId: string,
  item: WorkItem & {
    epic: { title: string };
    parent: { title: string } | null;
    dependencies: Array<{
      dependsOnWorkItemId: string;
      dependsOnWorkItem: { title: string };
    }>;
    acceptanceCriteria: Array<{
      id: string;
      text: string;
      isComplete: boolean;
      sortOrder: number;
    }>;
  },
): WorkItemDetailResponse => ({
  projectId,
  workItemId: item.id,
  epicId: item.epicId,
  epicTitle: item.epic.title,
  parentId: item.parentId,
  parentTitle: item.parent?.title ?? null,
  kind: item.kind === 'SUBTASK' ? 'subtask' : 'task',
  title: item.title,
  description: item.description,
  state: mapWorkflowState(item.state),
  priority: mapWorkflowPriority(item.priority),
  dependencyIds: item.dependencies.map((dependency) => dependency.dependsOnWorkItemId),
  dependencyTitles: item.dependencies.map(
    (dependency) => dependency.dependsOnWorkItem.title,
  ),
  acceptanceCriteria: item.acceptanceCriteria.map((criterion) => ({
    id: criterion.id,
    text: criterion.text,
    isComplete: criterion.isComplete,
    sortOrder: criterion.sortOrder,
  })),
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

const mapTransitionAuditEvent = (
  transition: WorkItemStateTransition,
): WorkItemAuditEvent => ({
  id: transition.id,
  type: 'transition',
  createdAt: transition.createdAt.toISOString(),
  summary: `Moved from ${mapWorkflowState(transition.fromState)} to ${mapWorkflowState(
    transition.toState,
  )}`,
  actorName: transition.isOperatorOverride ? 'Operator override' : 'Workflow engine',
  actorType: transition.isOperatorOverride ? 'human' : 'workflow',
  metadata: {
    fromState: mapWorkflowState(transition.fromState),
    toState: mapWorkflowState(transition.toState),
    reason: transition.reason,
    isOperatorOverride: transition.isOperatorOverride,
  },
});

const mapCommentAuditEvent = (comment: WorkItemComment): WorkItemAuditEvent => ({
  id: comment.id,
  type: 'comment',
  createdAt: comment.createdAt.toISOString(),
  summary: comment.content,
  actorName: comment.actorName,
  actorType: mapCommentActorType(comment.actorType),
  metadata: {
    commentId: comment.id,
  },
});

const mapAgentRunAuditEvent = (
  run: AgentRun & {
    decisions: AgentDecision[];
    failure: AgentFailure | null;
    artifacts: AgentRunArtifact[];
  },
): WorkItemAuditEvent => {
  const status = mapAgentRunStatus(run.status);
  const summaryPrefix = `${formatAgentTypeLabel(run.agentType)} run ${status}`;

  return {
    id: run.id,
    type: 'agentRun',
    createdAt: run.startedAt.toISOString(),
    summary: run.summary ? `${summaryPrefix}: ${run.summary}` : summaryPrefix,
    actorName: `${formatAgentTypeLabel(run.agentType)} agent`,
    actorType: 'agent',
    metadata: {
      agentRunId: run.id,
      agentType: run.agentType,
      agentRunStatus: status,
      completedAt: run.completedAt?.toISOString() ?? null,
      decisionCount: run.decisions.length,
      artifactCount: run.artifacts.length,
      failureMessage: run.failure?.errorMessage ?? null,
    },
  };
};

const mapReviewGateAuditEvent = (
  result: ReviewGateResult & {
    checks: ReviewGateCheck[];
  },
): WorkItemAuditEvent => {
  const overallStatus = mapReviewGateOverallStatus(result.overallStatus);
  const passedChecks = result.checks.filter((check) => check.status === 'PASSED').length;
  const failedChecks = result.checks.filter((check) => check.status === 'FAILED').length;
  const skippedChecks = result.checks.filter((check) => check.status === 'SKIPPED').length;
  const totalChecks = result.checks.length;
  const summaryPrefix = `Review gates ${overallStatus}`;

  return {
    id: result.id,
    type: 'reviewGate',
    createdAt: result.createdAt.toISOString(),
    summary: result.summary ? `${summaryPrefix}: ${result.summary}` : summaryPrefix,
    actorName: 'Review gate engine',
    actorType: 'workflow',
    metadata: {
      reviewGateResultId: result.id,
      reviewGateOverallStatus: overallStatus,
      reviewGatePassedChecks: passedChecks,
      reviewGateFailedChecks: failedChecks,
      reviewGateSkippedChecks: skippedChecks,
      reviewGateTotalChecks: totalChecks,
      relatedAgentRunId: result.agentRunId,
    },
  };
};

export const mapWorkItemAuditTrail = (
  projectId: string,
  workItemId: string,
  comments: WorkItemComment[],
  transitions: WorkItemStateTransition[],
  agentRuns: Array<
    AgentRun & {
      decisions: AgentDecision[];
      failure: AgentFailure | null;
      artifacts: AgentRunArtifact[];
    }
  >,
  reviewGateResults: Array<
    ReviewGateResult & {
      checks: ReviewGateCheck[];
    }
  >,
): WorkItemAuditTrailResponse => ({
  projectId,
  workItemId,
  items: [
    ...comments.map(mapCommentAuditEvent),
    ...transitions.map(mapTransitionAuditEvent),
    ...agentRuns.map(mapAgentRunAuditEvent),
    ...reviewGateResults.map(mapReviewGateAuditEvent),
  ].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  ),
});
