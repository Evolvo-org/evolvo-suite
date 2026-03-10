import {
  agentProviders,
  agentContextKinds,
  agentFailureCategories,
  agentArtifactTypes,
  agentRunStatuses,
  agentTypes,
  authRoles,
  billingSubscriptionStatuses,
  defaultProjectQueueLimits,
  interventionRetryStates,
  projectLifecycleStatuses,
  releaseNoteFormats,
  reviewGateCheckNames,
  reviewGateCheckStatuses,
  reviewGateOverallStatuses,
  runtimeArtifactTypes,
  runtimeHealthStatuses,
  runtimeJobOutcomes,
  schedulerLeaseLanes,
  structuredLogLevels,
  worktreeStatuses,
  workflowStates,
} from '@repo/shared';
import { z } from 'zod';

const workItemKinds = ['task', 'subtask'] as const;
const workItemPriorities = ['low', 'medium', 'high', 'urgent'] as const;
const completedReleaseRunStatuses = ['succeeded', 'failed', 'cancelled'] as const;
const optionalNonEmptyString = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    return value.trim().length === 0 ? undefined : value;
  },
  z.string().trim().min(1).optional(),
);

const inboxIdeaCandidateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  priority: z.enum(workItemPriorities),
  rationale: z.string().trim().min(1).max(5000),
  sourceSignals: z.array(z.string().trim().min(1).max(200)).min(1).max(12),
});

const agentRouteTargetSchema = z.object({
  provider: z.enum(agentProviders),
  model: z.string().trim().min(1).max(160),
});

const agentRouteOverridesSchema = z.object({
  inbox: agentRouteTargetSchema.optional(),
  planning: agentRouteTargetSchema.optional(),
  dev: agentRouteTargetSchema.optional(),
  review: agentRouteTargetSchema.optional(),
  release: agentRouteTargetSchema.optional(),
});

export const loginSchema = z.object({
  userId: z.string().trim().min(1).max(120),
  email: z.string().trim().email().optional(),
  displayName: z.string().trim().min(1).max(200).optional(),
  role: z.enum(authRoles),
  workspaceKey: z.string().trim().min(1).max(120).optional(),
});

export const agentRoutingConfigSchema = z.object({
  defaultProvider: z.enum(agentProviders),
  defaultModel: z.string().trim().min(1).max(160),
  agentRoutes: agentRouteOverridesSchema.default({}),
});

const projectQueueLimitsSchema = z.object({
  maxPlanning: z.number().int().positive(),
  maxReadyForDev: z.number().int().positive(),
  maxInDev: z.number().int().positive(),
  maxReadyForReview: z.number().int().positive(),
  maxInReview: z.number().int().positive(),
  maxReadyForRelease: z.number().int().positive(),
  maxReviewRetries: z.number().int().nonnegative(),
  maxMergeConflictRetries: z.number().int().nonnegative(),
  maxRuntimeRetries: z.number().int().nonnegative(),
  maxAmbiguityRetries: z.number().int().nonnegative(),
});

const projectRepositorySchema = z.object({
  provider: z.literal('github'),
  owner: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().url(),
  defaultBranch: z.string().trim().min(1).max(120),
  baseBranch: z.string().trim().min(1).max(120),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  repository: projectRepositorySchema,
  productDescription: z.string().trim().min(1),
  developmentPlan: z.string().trim().min(1).optional(),
  queueLimits: projectQueueLimitsSchema.optional(),
});

export const runProjectAutomationSchema = z.object({
  maxActions: z.number().int().positive().max(20).optional(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    repository: projectRepositorySchema.optional(),
    queueLimits: projectQueueLimitsSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.repository !== undefined ||
      value.queueLimits !== undefined,
    {
      message: 'At least one project field must be provided.',
    },
  );

export const projectListFiltersSchema = z.object({
  query: z.string().trim().min(1).optional(),
  lifecycleStatus: z.enum(projectLifecycleStatuses).optional(),
});

export const updateProjectRepositorySchema = projectRepositorySchema;

export const validateProjectRepositorySchema = projectRepositorySchema;

export const upsertProductSpecSchema = z.object({
  content: z.string().trim().min(1),
});

export const createDevelopmentPlanSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1),
});

export const updateDevelopmentPlanSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  content: z.string().trim().min(1),
  summary: z.string().trim().min(1).max(280).optional(),
  activate: z.boolean().optional(),
});

export const activateDevelopmentPlanVersionSchema = z.object({
  versionId: z.string().trim().min(1),
});

export const createEpicSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(5000).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const updateEpicSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    summary: z.string().trim().min(1).max(5000).nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.summary !== undefined ||
      value.sortOrder !== undefined,
    {
      message: 'At least one epic field must be provided.',
    },
  );

export const createWorkItemSchema = z.object({
  epicId: z.string().trim().min(1),
  parentId: z.string().trim().min(1).optional(),
  kind: z.enum(workItemKinds),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000).optional(),
  priority: z.enum(workItemPriorities).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const updateWorkItemSchema = z
  .object({
    epicId: z.string().trim().min(1).optional(),
    parentId: z.string().trim().min(1).nullable().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(10000).nullable().optional(),
    priority: z.enum(workItemPriorities).optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .refine(
    (value) =>
      value.epicId !== undefined ||
      value.parentId !== undefined ||
      value.title !== undefined ||
      value.description !== undefined ||
      value.priority !== undefined ||
      value.sortOrder !== undefined,
    {
      message: 'At least one work item field must be provided.',
    },
  );

export const updateWorkItemPrioritySchema = z.object({
  priority: z.enum(workItemPriorities),
});

export const updateWorkItemDependenciesSchema = z.object({
  dependencyIds: z.array(z.string().trim().min(1)).max(50),
});

export const createAcceptanceCriterionSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  isComplete: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const updateAcceptanceCriterionSchema = z
  .object({
    text: z.string().trim().min(1).max(2000).optional(),
    isComplete: z.boolean().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .refine(
    (value) =>
      value.text !== undefined ||
      value.isComplete !== undefined ||
      value.sortOrder !== undefined,
    {
      message: 'At least one acceptance criterion field must be provided.',
    },
  );

export const transitionWorkItemSchema = z.object({
  toState: z.enum(workflowStates),
  reason: z.string().trim().min(1).max(2000).optional(),
  operatorOverride: z.boolean().optional(),
});

export const createWorkItemCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  actorType: z.enum(['human', 'agent', 'system']).optional(),
  actorName: z.string().trim().min(1).max(160).optional(),
});

export const agentContextReferenceSchema = z.object({
  kind: z.enum(agentContextKinds),
  id: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(200).optional(),
});

export const agentInputContractSchema = z.object({
  agentType: z.enum(agentTypes),
  projectId: z.string().trim().min(1).max(160),
  workItemId: z.string().trim().min(1).max(160).optional(),
  runtimeId: z.string().trim().min(1).max(160).optional(),
  leaseId: z.string().trim().min(1).max(160).optional(),
  goal: z.string().trim().min(1).max(5000),
  instructions: z.string().trim().min(1).max(10000).optional(),
  context: z.array(agentContextReferenceSchema).max(200),
  metadata: z.record(z.string().trim().min(1).max(200)).optional(),
});

export const agentFailureContractSchema = z.object({
  category: z.enum(agentFailureCategories),
  message: z.string().trim().min(1).max(5000),
  retryable: z.boolean(),
  details: z.string().trim().min(1).max(10000).optional(),
});

export const agentUsageReportContractSchema = z.object({
  provider: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(160),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative().optional(),
  estimatedCostUsd: z.number().nonnegative().optional(),
});

export const agentResultContractSchema = z.object({
  status: z.enum(agentRunStatuses),
  summary: z.string().trim().min(1).max(5000),
  nextState: z.enum(workflowStates).optional(),
  decisionSummary: z.string().trim().min(1).max(5000).optional(),
  artifactLabels: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  usage: agentUsageReportContractSchema.optional(),
  failure: agentFailureContractSchema.optional(),
});

export const structuredLogQuerySchema = z.object({
  level: z.enum(structuredLogLevels).optional(),
  source: z.string().trim().min(1).max(120).optional(),
  eventType: z.string().trim().min(1).max(160).optional(),
  correlationId: z.string().trim().min(1).max(160).optional(),
  workItemId: z.string().trim().min(1).max(160).optional(),
  agentRunId: z.string().trim().min(1).max(160).optional(),
  runtimeId: z.string().trim().min(1).max(160).optional(),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const updateSystemQueueLimitsSchema = projectQueueLimitsSchema;

export const updateSystemAgentRoutingSchema = agentRoutingConfigSchema;

export const updateProjectQueueLimitsSchema = projectQueueLimitsSchema;

export const updateProjectAgentRoutingSchema = agentRoutingConfigSchema;

export const acquireSchedulerLeaseSchema = z.object({
  runtimeId: z.string().trim().min(1).max(160),
  lanes: z.array(z.enum(schedulerLeaseLanes)).min(1).max(3).optional(),
  projectId: z.string().trim().min(1).optional(),
  leaseDurationSeconds: z.number().int().min(30).max(3600).optional(),
});

export const renewSchedulerLeaseSchema = z.object({
  runtimeId: z.string().trim().min(1).max(160),
  leaseToken: z.string().trim().min(1).max(200),
  leaseDurationSeconds: z.number().int().min(30).max(3600).optional(),
});

export const recoverSchedulerLeasesSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
});

export const schedulerStateQuerySchema = z.object({
  projectId: z.string().trim().min(1).optional(),
});

export const registerRuntimeSchema = z.object({
  runtimeId: z.string().trim().min(1).max(160),
  displayName: z.string().trim().min(1).max(160),
  capabilities: z.array(z.string().trim().min(1).max(160)).max(50).optional(),
});

export const runtimeHeartbeatSchema = z.object({
  status: z.enum(runtimeHealthStatuses),
  activeJobSummary: z.string().trim().min(1).max(5000).optional(),
  lastAction: z.string().trim().min(1).max(5000).optional(),
  lastError: z.string().trim().min(1).max(5000).optional(),
});

export const requestRuntimeWorkSchema = z.object({
  lanes: z.array(z.enum(schedulerLeaseLanes)).min(1).max(3).optional(),
  projectId: z.string().trim().min(1).optional(),
  leaseDurationSeconds: z.number().int().min(30).max(3600).optional(),
});

export const runtimeProgressUpdateSchema = z.object({
  leaseToken: z.string().trim().min(1).max(200),
  activeJobSummary: z.string().trim().min(1).max(5000).optional(),
  lastAction: z.string().trim().min(1).max(5000).optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  leaseDurationSeconds: z.number().int().min(30).max(3600).optional(),
});

export const runtimeJobResultSchema = z.object({
  leaseToken: z.string().trim().min(1).max(200),
  outcome: z.enum(runtimeJobOutcomes),
  nextState: z.enum(workflowStates).optional(),
  summary: z.string().trim().min(1).max(5000).optional(),
  errorMessage: z.string().trim().min(1).max(5000).optional(),
});

export const runtimeArtifactUploadMetadataSchema = z.object({
  leaseToken: z.string().trim().min(1).max(200),
  artifactType: z.enum(runtimeArtifactTypes),
  fileName: z.string().trim().min(1).max(260),
  contentType: z.string().trim().min(1).max(160).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});

export const upsertWorktreeSchema = z.object({
  workItemId: z.string().trim().min(1),
  runtimeId: z.string().trim().min(1).max(160).optional(),
  leaseId: z.string().trim().min(1).optional(),
  status: z.enum(worktreeStatuses),
  path: z.string().trim().min(1).max(1000),
  branchName: z.string().trim().min(1).max(200),
  baseBranch: z.string().trim().min(1).max(200),
  headSha: z.string().trim().min(1).max(200).optional(),
  pullRequestUrl: z.string().trim().url().optional(),
  isDirty: z.boolean().optional(),
  details: z.string().trim().min(1).max(10000).optional(),
});

export const markWorktreeStaleSchema = z.object({
  reason: z.string().trim().min(1).max(5000).optional(),
});

export const requestWorktreeCleanupSchema = z.object({
  reason: z.string().trim().min(1).max(5000).optional(),
});

export const createAgentRunSchema = z.object({
  agentType: z.string().trim().min(1).max(160),
  status: z.enum(agentRunStatuses).optional(),
  runtimeId: z.string().trim().min(1).max(160).optional(),
  leaseId: z.string().trim().min(1).optional(),
  startedAt: z.string().trim().datetime().optional(),
  completedAt: z.string().trim().datetime().optional(),
  summary: z.string().trim().min(1).max(10000).optional(),
});

export const createAgentDecisionSchema = z.object({
  decision: z.string().trim().min(1).max(10000),
  rationale: z.string().trim().min(1).max(10000).optional(),
});

export const createAgentFailureSchema = z.object({
  errorMessage: z.string().trim().min(1).max(10000),
  details: z.string().trim().min(1).max(10000).optional(),
});

export const upsertPromptSnapshotSchema = z
  .object({
    systemPrompt: z.string().trim().min(1).max(20000).optional(),
    userPrompt: z.string().trim().min(1).max(20000).optional(),
    messagesJson: z.string().trim().min(1).max(50000).optional(),
  })
  .refine(
    (value) =>
      value.systemPrompt !== undefined ||
      value.userPrompt !== undefined ||
      value.messagesJson !== undefined,
    {
      message: 'At least one prompt snapshot field must be provided.',
    },
  );

export const createAgentArtifactSchema = z.object({
  artifactType: z.enum(agentArtifactTypes),
  label: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(20000).optional(),
  url: z.string().trim().url().optional(),
});

export const generateInboxIdeasSchema = z.object({
  maxIdeas: z.number().int().positive().max(10).optional(),
  runtimeId: z.string().trim().min(1).max(160).optional(),
});

export const inboxIdeaCandidatesSchema = z.array(inboxIdeaCandidateSchema).min(1).max(10);

export const triageInboxIdeaSchema = z.object({
  runtimeId: z.string().trim().min(1).max(160).optional(),
});

export const executeDevTaskSchema = z.object({
  runtimeId: z.string().trim().min(1).max(160).optional(),
  leaseId: z.string().trim().min(1).max(160).optional(),
});

export const executeReviewSchema = z.object({
  runtimeId: z.string().trim().min(1).max(160).optional(),
  leaseId: z.string().trim().min(1).max(160).optional(),
});

export const executeReleaseSchema = z.object({
  runtimeId: z.string().trim().min(1).max(160).optional(),
  leaseId: z.string().trim().min(1).max(160).optional(),
  outcome: z.enum(['success', 'mergeConflict']).optional(),
});

export const createReviewGateResultSchema = z.object({
  runtimeId: z.string().trim().min(1).max(160).optional(),
  leaseId: z.string().trim().min(1).optional(),
  agentRunId: z.string().trim().min(1).optional(),
  overallStatus: z.enum(reviewGateOverallStatuses).optional(),
  summary: z.string().trim().min(1).max(10000).optional(),
  checks: z
    .array(
      z.object({
        name: z.enum(reviewGateCheckNames),
        status: z.enum(reviewGateCheckStatuses),
        details: z.string().trim().min(1).max(10000).optional(),
      }),
    )
    .min(1)
    .max(6)
    .refine(
      (checks) => new Set(checks.map((check) => check.name)).size === checks.length,
      {
        message: 'Each review gate check can only be reported once per result.',
      },
    ),
  criteriaEvaluations: z
    .array(
      z.object({
        criterionId: z.string().trim().min(1).optional(),
        text: z.string().trim().min(1).max(2000),
        status: z.enum(reviewGateCheckStatuses),
        details: z.string().trim().min(1).max(10000).optional(),
        sortOrder: z.number().int().nonnegative().optional(),
      }),
    )
    .max(100)
    .optional(),
});

export const createReleaseRunSchema = z.object({
  runtimeId: z.string().trim().min(1).max(160).optional(),
  leaseId: z.string().trim().min(1).optional(),
  worktreeId: z.string().trim().min(1).optional(),
  summary: z.string().trim().min(1).max(10000).optional(),
  startedAt: z.string().trim().datetime().optional(),
});

export const recordReleaseResultSchema = z.object({
  status: z.enum(completedReleaseRunStatuses),
  summary: z.string().trim().min(1).max(10000).optional(),
  errorMessage: z.string().trim().min(1).max(10000).optional(),
  mergeCommitSha: z.string().trim().min(1).max(200).optional(),
  releaseUrl: z.string().trim().url().optional(),
  completedAt: z.string().trim().datetime().optional(),
});

export const createReleaseVersionSchema = z.object({
  version: z.string().trim().min(1).max(120),
  tagName: z.string().trim().min(1).max(200),
  targetBranch: z.string().trim().min(1).max(200).optional(),
  commitSha: z.string().trim().min(1).max(200).optional(),
});

export const upsertReleaseNoteSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().min(1).max(50000),
  format: z.enum(releaseNoteFormats).optional(),
});

export const createHumanInterventionSchema = z.object({
  summary: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(1).max(10000),
  attemptsMade: z.string().trim().min(1).max(10000).optional(),
  evidence: z.string().trim().min(1).max(10000).optional(),
  suggestedAction: z.string().trim().min(1).max(10000).optional(),
});

export const resolveHumanInterventionSchema = z.object({
  resolutionNotes: z.string().trim().min(1).max(10000).optional(),
});

export const retryHumanInterventionSchema = z.object({
  toState: z.enum(interventionRetryStates),
  resolutionNotes: z.string().trim().min(1).max(10000).optional(),
});

export const createUsageEventSchema = z.object({
  workItemId: z.string().trim().min(1).optional(),
  agentRunId: z.string().trim().min(1).optional(),
  runtimeId: z.string().trim().min(1).max(160).optional(),
  userId: z.string().trim().min(1).max(160).optional(),
  agentType: z.string().trim().min(1).max(160),
  provider: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(160),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  estimatedCostUsd: z.number().nonnegative().optional(),
  occurredAt: z.string().trim().datetime().optional(),
});

export const upsertStripeCustomerMappingSchema = z.object({
  workspaceKey: z.string().trim().min(1).max(120).optional(),
  stripeCustomerId: z.string().trim().min(1).max(200),
  email: z.string().trim().email().optional(),
  displayName: z.string().trim().min(1).max(200).optional(),
});

export const upsertBillingSubscriptionSchema = z.object({
  workspaceKey: z.string().trim().min(1).max(120).optional(),
  stripeSubscriptionId: z.string().trim().min(1).max(200).optional(),
  status: z.enum(billingSubscriptionStatuses),
  planKey: z.string().trim().min(1).max(120).optional(),
  currentPeriodEnd: z.string().trim().datetime().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  adminBypassActive: z.boolean().optional(),
});

export const createBillingPortalSessionSchema = z.object({
  workspaceKey: z.string().trim().min(1).max(120).optional(),
  returnUrl: z.string().trim().url().optional(),
});

export const stripeWebhookEventSchema = z.object({
  eventId: z.string().trim().min(1).max(200),
  eventType: z.string().trim().min(1).max(200),
  workspaceKey: z.string().trim().min(1).max(120).optional(),
  stripeCustomerId: z.string().trim().min(1).max(200).optional(),
  stripeSubscriptionId: z.string().trim().min(1).max(200).optional(),
  status: z.enum(billingSubscriptionStatuses).optional(),
  planKey: z.string().trim().min(1).max(120).optional(),
  currentPeriodEnd: z.string().trim().datetime().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  email: z.string().trim().email().optional(),
  displayName: z.string().trim().min(1).max(200).optional(),
  adminBypassActive: z.boolean().optional(),
  payloadJson: z.string().trim().min(1).max(50000).optional(),
});

export const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().trim().min(1).default('api/v1'),
  CORS_ORIGIN: z.string().trim().default('*'),
  DATABASE_URL: z
    .string()
    .trim()
    .default('postgresql://evolvo:evolvo@localhost:5432/evolvo?schema=public'),
  AUTH_SESSION_SECRET: z.string().trim().min(1).default('evolvo-local-auth-secret'),
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  AUTH_DEV_LOGIN_ENABLED: z.coerce.boolean().default(true),
  STRIPE_SECRET_KEY: z.string().trim().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().trim().optional(),
  BILLING_ADMIN_BYPASS: z.coerce.boolean().default(false),
  REALTIME_SOCKET_TOKEN: z.string().trim().default('evolvo-local-realtime-token'),
  LOG_LEVEL: z
    .enum(['log', 'error', 'warn', 'debug', 'verbose'])
    .default('log'),
});

export const runtimeEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  RUNTIME_ID: z.string().trim().min(1).default('runtime-local'),
  RUNTIME_DISPLAY_NAME: z.string().trim().min(1).max(160).optional(),
  RUNTIME_CAPABILITIES: z.string().trim().default('git,leases,heartbeats'),
  API_BASE_URL: z.string().trim().url().default('http://localhost:3000/api/v1'),
  API_AUTH_TOKEN: optionalNonEmptyString,
  API_RETRY_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  API_RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().default(500),
  REPOSITORIES_ROOT: z.string().trim().min(1).default('./.runtime/repos'),
  HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(30000),
  WORK_POLLING_ENABLED: z.coerce.boolean().default(false),
  WORK_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(15000),
  WORK_POLL_IDLE_BACKOFF_MS: z.coerce.number().int().positive().default(5000),
  WORK_POLL_MAX_BACKOFF_MS: z.coerce.number().int().positive().default(60000),
  LEASE_PROGRESS_INTERVAL_MS: z.coerce.number().int().positive().default(30000),
});

export {
  defaultProjectQueueLimits,
  projectQueueLimitsSchema,
  projectRepositorySchema,
};
