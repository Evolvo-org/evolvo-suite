export interface ProjectQueueLimits {
  maxPlanning: number;
  maxReadyForDev: number;
  maxInDev: number;
  maxReadyForReview: number;
  maxInReview: number;
  maxReadyForRelease: number;
  maxReviewRetries: number;
  maxMergeConflictRetries: number;
  maxRuntimeRetries: number;
  maxAmbiguityRetries: number;
}

export const defaultProjectQueueLimits: ProjectQueueLimits = {
  maxPlanning: 10,
  maxReadyForDev: 12,
  maxInDev: 3,
  maxReadyForReview: 3,
  maxInReview: 2,
  maxReadyForRelease: 2,
  maxReviewRetries: 3,
  maxMergeConflictRetries: 2,
  maxRuntimeRetries: 3,
  maxAmbiguityRetries: 2,
};
