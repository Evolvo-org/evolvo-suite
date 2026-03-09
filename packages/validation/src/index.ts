import {
  defaultProjectQueueLimits,
  projectLifecycleStatuses,
  runtimeHealthStatuses,
  schedulerLeaseLanes,
  workflowStates,
} from '@repo/shared';
import { z } from 'zod';

const workItemKinds = ['task', 'subtask'] as const;
const workItemPriorities = ['low', 'medium', 'high', 'urgent'] as const;

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

export const updateSystemQueueLimitsSchema = projectQueueLimitsSchema;

export const updateProjectQueueLimitsSchema = projectQueueLimitsSchema;

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
  LOG_LEVEL: z
    .enum(['log', 'error', 'warn', 'debug', 'verbose'])
    .default('log'),
});

export const runtimeEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  RUNTIME_ID: z.string().trim().min(1).default('runtime-local'),
  API_BASE_URL: z.string().trim().url().default('http://localhost:3000/api/v1'),
  REPOSITORIES_ROOT: z.string().trim().min(1).default('./.runtime/repos'),
  HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(30000),
});

export {
  defaultProjectQueueLimits,
  projectQueueLimitsSchema,
  projectRepositorySchema,
};
