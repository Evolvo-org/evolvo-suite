export const observabilityMetricNames = [
  'runtimeOffline',
  'failedLease',
  'repeatedReviewFailure',
  'releaseFailure',
  'usageSpike',
] as const;

export type ObservabilityMetricName = (typeof observabilityMetricNames)[number];

export const observabilityMetricStatuses = ['ok', 'warning'] as const;
export type ObservabilityMetricStatus = (typeof observabilityMetricStatuses)[number];

export interface ObservabilityMetricRecord {
  name: ObservabilityMetricName;
  value: number;
  threshold: number | null;
  status: ObservabilityMetricStatus;
  details: string;
  observedAt: string;
}

export interface ProjectObservabilityMetricsResponse {
  projectId: string;
  generatedAt: string;
  items: ObservabilityMetricRecord[];
}