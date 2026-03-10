-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workItemId" TEXT,
    "agentRunId" TEXT,
    "runtimeId" TEXT,
    "userId" TEXT,
    "agentType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageEvent_projectId_occurredAt_idx" ON "UsageEvent"("projectId", "occurredAt");
CREATE INDEX "UsageEvent_userId_occurredAt_idx" ON "UsageEvent"("userId", "occurredAt");
CREATE INDEX "UsageEvent_provider_model_occurredAt_idx" ON "UsageEvent"("provider", "model", "occurredAt");
CREATE INDEX "UsageEvent_agentType_occurredAt_idx" ON "UsageEvent"("agentType", "occurredAt");
CREATE INDEX "UsageEvent_workItemId_occurredAt_idx" ON "UsageEvent"("workItemId", "occurredAt");
CREATE INDEX "UsageEvent_agentRunId_occurredAt_idx" ON "UsageEvent"("agentRunId", "occurredAt");
CREATE INDEX "UsageEvent_runtimeId_occurredAt_idx" ON "UsageEvent"("runtimeId", "occurredAt");

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "RuntimeInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
