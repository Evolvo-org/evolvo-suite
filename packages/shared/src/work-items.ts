import type { WorkItemPriority, WorkItemKind } from './planning-hierarchy';
import type { AgentRunStatus } from './agents';
import type { ReviewGateOverallStatus } from './review-gates';
import type { WorkItemState } from './workflow';

export type WorkItemCommentActorType = 'human' | 'agent' | 'system';

export interface WorkItemCommentItem {
  id: string;
  workItemId: string;
  actorType: WorkItemCommentActorType;
  actorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkItemCommentsResponse {
  projectId: string;
  workItemId: string;
  items: WorkItemCommentItem[];
}

export interface CreateWorkItemCommentRequest {
  content: string;
  actorType?: WorkItemCommentActorType;
  actorName?: string;
}

export interface WorkItemAuditEvent {
  id: string;
  type: 'comment' | 'transition' | 'agentRun' | 'reviewGate';
  createdAt: string;
  summary: string;
  actorName: string;
  actorType: WorkItemCommentActorType | 'workflow';
  metadata?: {
    fromState?: WorkItemState;
    toState?: WorkItemState;
    reason?: string | null;
    isOperatorOverride?: boolean;
    commentId?: string;
    agentRunId?: string;
    agentType?: string;
    agentRunStatus?: AgentRunStatus;
    completedAt?: string | null;
    decisionCount?: number;
    artifactCount?: number;
    failureMessage?: string | null;
    reviewGateResultId?: string;
    reviewGateOverallStatus?: ReviewGateOverallStatus;
    reviewGatePassedChecks?: number;
    reviewGateFailedChecks?: number;
    reviewGateSkippedChecks?: number;
    reviewGateTotalChecks?: number;
    relatedAgentRunId?: string | null;
  };
}

export interface WorkItemAuditTrailResponse {
  projectId: string;
  workItemId: string;
  items: WorkItemAuditEvent[];
}

export interface WorkItemDetailResponse {
  projectId: string;
  workItemId: string;
  epicId: string;
  epicTitle: string;
  parentId: string | null;
  parentTitle: string | null;
  kind: WorkItemKind;
  title: string;
  description: string | null;
  state: WorkItemState;
  priority: WorkItemPriority;
  dependencyIds: string[];
  dependencyTitles: string[];
  acceptanceCriteria: Array<{
    id: string;
    text: string;
    isComplete: boolean;
    sortOrder: number;
  }>;
  createdAt: string;
  updatedAt: string;
}
