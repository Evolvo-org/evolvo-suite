export const reviewGateOverallStatuses = ['passed', 'failed'] as const;
export type ReviewGateOverallStatus = (typeof reviewGateOverallStatuses)[number];

export const reviewGateCheckNames = [
  'build',
  'lint',
  'typecheck',
  'test',
  'acceptanceCriteria',
  'reviewFeedback',
] as const;
export type ReviewGateCheckName = (typeof reviewGateCheckNames)[number];

export const reviewGateCheckStatuses = ['passed', 'failed', 'skipped'] as const;
export type ReviewGateCheckStatus = (typeof reviewGateCheckStatuses)[number];

export interface ReviewGateCheckInput {
  name: ReviewGateCheckName;
  status: ReviewGateCheckStatus;
  details?: string;
}

export interface ReviewCriterionEvaluationInput {
  criterionId?: string;
  text: string;
  status: ReviewGateCheckStatus;
  details?: string;
  sortOrder?: number;
}

export interface CreateReviewGateResultRequest {
  runtimeId?: string;
  leaseId?: string;
  agentRunId?: string;
  overallStatus?: ReviewGateOverallStatus;
  summary?: string;
  checks: ReviewGateCheckInput[];
  criteriaEvaluations?: ReviewCriterionEvaluationInput[];
}

export interface ReviewGateCheckRecord {
  id: string;
  name: ReviewGateCheckName;
  status: ReviewGateCheckStatus;
  details: string | null;
  createdAt: string;
}

export interface ReviewCriterionEvaluationRecord {
  id: string;
  criterionId: string | null;
  text: string;
  status: ReviewGateCheckStatus;
  details: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ReviewGateResultRecord {
  id: string;
  projectId: string;
  workItemId: string;
  runtimeId: string | null;
  leaseId: string | null;
  agentRunId: string | null;
  overallStatus: ReviewGateOverallStatus;
  summary: string | null;
  checks: ReviewGateCheckRecord[];
  criteriaEvaluations: ReviewCriterionEvaluationRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewGateListResponse {
  projectId: string;
  workItemId: string;
  items: ReviewGateResultRecord[];
}

export interface ReviewGateSummaryResponse {
  projectId: string;
  workItemId: string;
  totalResults: number;
  passedResults: number;
  failedResults: number;
  latest: ReviewGateResultRecord | null;
  latestChecks: Partial<Record<ReviewGateCheckName, ReviewGateCheckStatus>>;
  latestCriteria: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}
