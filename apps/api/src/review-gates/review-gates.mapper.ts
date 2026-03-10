import type {
  ReviewCriterionEvaluation,
  ReviewGateCheck,
  ReviewGateResult,
} from '@repo/db/client';
import type {
  ReviewGateCheckName,
  ReviewGateCheckStatus,
  ReviewGateListResponse,
  ReviewGateOverallStatus,
  ReviewGateResultRecord,
  ReviewGateSummaryResponse,
} from '@repo/shared';

const mapOverallStatus = (
  value: ReviewGateResult['overallStatus'],
): ReviewGateOverallStatus => {
  switch (value) {
    case 'FAILED':
      return 'failed';
    default:
      return 'passed';
  }
};

const mapCheckName = (value: ReviewGateCheck['name']): ReviewGateCheckName => {
  switch (value) {
    case 'BUILD':
      return 'build';
    case 'LINT':
      return 'lint';
    case 'TYPECHECK':
      return 'typecheck';
    case 'TEST':
      return 'test';
    case 'ACCEPTANCE_CRITERIA':
      return 'acceptanceCriteria';
    default:
      return 'reviewFeedback';
  }
};

const mapCheckStatus = (
  value: ReviewGateCheck['status'] | ReviewCriterionEvaluation['status'],
): ReviewGateCheckStatus => {
  switch (value) {
    case 'FAILED':
      return 'failed';
    case 'SKIPPED':
      return 'skipped';
    default:
      return 'passed';
  }
};

export const mapReviewGateResult = (
  result: ReviewGateResult & {
    checks: ReviewGateCheck[];
    criteriaEvaluations: ReviewCriterionEvaluation[];
  },
): ReviewGateResultRecord => ({
  id: result.id,
  projectId: result.projectId,
  workItemId: result.workItemId,
  runtimeId: result.runtimeId,
  leaseId: result.leaseId,
  agentRunId: result.agentRunId,
  overallStatus: mapOverallStatus(result.overallStatus),
  summary: result.summary,
  checks: result.checks.map((check) => ({
    id: check.id,
    name: mapCheckName(check.name),
    status: mapCheckStatus(check.status),
    details: check.details,
    createdAt: check.createdAt.toISOString(),
  })),
  criteriaEvaluations: result.criteriaEvaluations.map((evaluation) => ({
    id: evaluation.id,
    criterionId: evaluation.criterionId,
    text: evaluation.text,
    status: mapCheckStatus(evaluation.status),
    details: evaluation.details,
    sortOrder: evaluation.sortOrder,
    createdAt: evaluation.createdAt.toISOString(),
  })),
  createdAt: result.createdAt.toISOString(),
  updatedAt: result.updatedAt.toISOString(),
});

export const mapReviewGateList = (
  projectId: string,
  workItemId: string,
  items: Array<
    ReviewGateResult & {
      checks: ReviewGateCheck[];
      criteriaEvaluations: ReviewCriterionEvaluation[];
    }
  >,
): ReviewGateListResponse => ({
  projectId,
  workItemId,
  items: items.map(mapReviewGateResult),
});

export const mapReviewGateSummary = (
  projectId: string,
  workItemId: string,
  items: Array<
    ReviewGateResult & {
      checks: ReviewGateCheck[];
      criteriaEvaluations: ReviewCriterionEvaluation[];
    }
  >,
): ReviewGateSummaryResponse => {
  const latestItem = items[0] ? mapReviewGateResult(items[0]) : null;

  return {
    projectId,
    workItemId,
    totalResults: items.length,
    passedResults: items.filter((item) => item.overallStatus === 'PASSED').length,
    failedResults: items.filter((item) => item.overallStatus === 'FAILED').length,
    latest: latestItem,
    latestChecks: Object.fromEntries(
      latestItem?.checks.map((check) => [check.name, check.status]) ?? [],
    ),
    latestCriteria: {
      total: latestItem?.criteriaEvaluations.length ?? 0,
      passed:
        latestItem?.criteriaEvaluations.filter(
          (evaluation) => evaluation.status === 'passed',
        ).length ?? 0,
      failed:
        latestItem?.criteriaEvaluations.filter(
          (evaluation) => evaluation.status === 'failed',
        ).length ?? 0,
      skipped:
        latestItem?.criteriaEvaluations.filter(
          (evaluation) => evaluation.status === 'skipped',
        ).length ?? 0,
    },
  };
};
