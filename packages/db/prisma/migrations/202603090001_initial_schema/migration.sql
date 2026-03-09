CREATE TYPE "ProjectLifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED');
CREATE TYPE "ProjectRepositoryProvider" AS ENUM ('GITHUB');

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "lifecycleStatus" "ProjectLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectRepository" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "provider" "ProjectRepositoryProvider" NOT NULL DEFAULT 'GITHUB',
  "owner" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "defaultBranch" TEXT NOT NULL DEFAULT 'main',
  "baseBranch" TEXT NOT NULL DEFAULT 'main',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectRepository_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectQueueLimits" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "maxPlanning" INTEGER NOT NULL,
  "maxReadyForDev" INTEGER NOT NULL,
  "maxInDev" INTEGER NOT NULL,
  "maxReadyForReview" INTEGER NOT NULL,
  "maxInReview" INTEGER NOT NULL,
  "maxReadyForRelease" INTEGER NOT NULL,
  "maxReviewRetries" INTEGER NOT NULL,
  "maxMergeConflictRetries" INTEGER NOT NULL,
  "maxRuntimeRetries" INTEGER NOT NULL,
  "maxAmbiguityRetries" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectQueueLimits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductSpec" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSpec_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DevelopmentPlan" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "activeVersionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DevelopmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanVersion" (
  "id" TEXT NOT NULL,
  "developmentPlanId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "summary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE UNIQUE INDEX "ProjectRepository_projectId_key" ON "ProjectRepository"("projectId");
CREATE UNIQUE INDEX "ProjectQueueLimits_projectId_key" ON "ProjectQueueLimits"("projectId");
CREATE UNIQUE INDEX "ProductSpec_projectId_key" ON "ProductSpec"("projectId");
CREATE UNIQUE INDEX "DevelopmentPlan_projectId_key" ON "DevelopmentPlan"("projectId");
CREATE UNIQUE INDEX "DevelopmentPlan_activeVersionId_key" ON "DevelopmentPlan"("activeVersionId");
CREATE UNIQUE INDEX "PlanVersion_developmentPlanId_versionNumber_key" ON "PlanVersion"("developmentPlanId", "versionNumber");

ALTER TABLE "ProjectRepository"
  ADD CONSTRAINT "ProjectRepository_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectQueueLimits"
  ADD CONSTRAINT "ProjectQueueLimits_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductSpec"
  ADD CONSTRAINT "ProductSpec_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DevelopmentPlan"
  ADD CONSTRAINT "DevelopmentPlan_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DevelopmentPlan"
  ADD CONSTRAINT "DevelopmentPlan_activeVersionId_fkey"
  FOREIGN KEY ("activeVersionId") REFERENCES "PlanVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlanVersion"
  ADD CONSTRAINT "PlanVersion_developmentPlanId_fkey"
  FOREIGN KEY ("developmentPlanId") REFERENCES "DevelopmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
