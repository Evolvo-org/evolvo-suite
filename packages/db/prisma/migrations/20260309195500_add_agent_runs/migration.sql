-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentArtifactType" AS ENUM ('LOG', 'PATCH', 'REPORT', 'PLAN', 'OTHER');

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "runtimeId" TEXT,
    "leaseId" TEXT,
    "agentType" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDecision" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentFailure" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentFailure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptSnapshot" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "userPrompt" TEXT,
    "messagesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRunArtifact" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "artifactType" "AgentArtifactType" NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRunArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentRun_projectId_createdAt_idx" ON "AgentRun"("projectId", "createdAt");
CREATE INDEX "AgentRun_workItemId_createdAt_idx" ON "AgentRun"("workItemId", "createdAt");
CREATE INDEX "AgentRun_runtimeId_createdAt_idx" ON "AgentRun"("runtimeId", "createdAt");
CREATE INDEX "AgentRun_leaseId_createdAt_idx" ON "AgentRun"("leaseId", "createdAt");
CREATE INDEX "AgentDecision_agentRunId_createdAt_idx" ON "AgentDecision"("agentRunId", "createdAt");
CREATE UNIQUE INDEX "AgentFailure_agentRunId_key" ON "AgentFailure"("agentRunId");
CREATE UNIQUE INDEX "PromptSnapshot_agentRunId_key" ON "PromptSnapshot"("agentRunId");
CREATE INDEX "AgentRunArtifact_agentRunId_createdAt_idx" ON "AgentRunArtifact"("agentRunId", "createdAt");

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "RuntimeInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "WorkItemLease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentDecision" ADD CONSTRAINT "AgentDecision_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentFailure" ADD CONSTRAINT "AgentFailure_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptSnapshot" ADD CONSTRAINT "PromptSnapshot_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentRunArtifact" ADD CONSTRAINT "AgentRunArtifact_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
