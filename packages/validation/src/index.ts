import {
  defaultProjectQueueLimits,
  projectLifecycleStatuses,
} from '@repo/shared';
import { z } from 'zod';

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

export { defaultProjectQueueLimits, projectQueueLimitsSchema };
