-- CreateEnum
CREATE TYPE "ReviewGateOverallStatus" AS ENUM ('PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewGateCheckName" AS ENUM ('BUILD', 'LINT', 'TYPECHECK', 'TEST', 'ACCEPTANCE_CRITERIA', 'REVIEW_FEEDBACK');

-- CreateEnum
CREATE TYPE "ReviewGateCheckStatus" AS ENUM ('PASSED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "ReviewGateResult" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "runtimeId" TEXT,
    "leaseId" TEXT,
    "agentRunId" TEXT,
    "overallStatus" "ReviewGateOverallStatus" NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewGateResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewGateCheck" (
    "id" TEXT NOT NULL,
    "reviewGateResultId" TEXT NOT NULL,
    "name" "ReviewGateCheckName" NOT NULL,
    "status" "ReviewGateCheckStatus" NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewGateCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCriterionEvaluation" (
    "id" TEXT NOT NULL,
    "reviewGateResultId" TEXT NOT NULL,
    "criterionId" TEXT,
    "text" TEXT NOT NULL,
    "status" "ReviewGateCheckStatus" NOT NULL,
    "details" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewCriterionEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewGateResult_projectId_workItemId_createdAt_idx" ON "ReviewGateResult"("projectId", "workItemId", "createdAt");
CREATE INDEX "ReviewGateResult_runtimeId_createdAt_idx" ON "ReviewGateResult"("runtimeId", "createdAt");
CREATE INDEX "ReviewGateResult_leaseId_createdAt_idx" ON "ReviewGateResult"("leaseId", "createdAt");
CREATE INDEX "ReviewGateResult_agentRunId_createdAt_idx" ON "ReviewGateResult"("agentRunId", "createdAt");
CREATE UNIQUE INDEX "ReviewGateCheck_reviewGateResultId_name_key" ON "ReviewGateCheck"("reviewGateResultId", "name");
CREATE INDEX "ReviewGateCheck_reviewGateResultId_createdAt_idx" ON "ReviewGateCheck"("reviewGateResultId", "createdAt");
CREATE INDEX "ReviewCriterionEvaluation_reviewGateResultId_sortOrder_idx" ON "ReviewCriterionEvaluation"("reviewGateResultId", "sortOrder");
CREATE INDEX "ReviewCriterionEvaluation_criterionId_idx" ON "ReviewCriterionEvaluation"("criterionId");

-- AddForeignKey
ALTER TABLE "ReviewGateResult" ADD CONSTRAINT "ReviewGateResult_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewGateResult" ADD CONSTRAINT "ReviewGateResult_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "RuntimeInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReviewGateResult" ADD CONSTRAINT "ReviewGateResult_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "WorkItemLease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReviewGateResult" ADD CONSTRAINT "ReviewGateResult_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReviewGateCheck" ADD CONSTRAINT "ReviewGateCheck_reviewGateResultId_fkey" FOREIGN KEY ("reviewGateResultId") REFERENCES "ReviewGateResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewCriterionEvaluation" ADD CONSTRAINT "ReviewCriterionEvaluation_reviewGateResultId_fkey" FOREIGN KEY ("reviewGateResultId") REFERENCES "ReviewGateResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewCriterionEvaluation" ADD CONSTRAINT "ReviewCriterionEvaluation_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "AcceptanceCriterion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
