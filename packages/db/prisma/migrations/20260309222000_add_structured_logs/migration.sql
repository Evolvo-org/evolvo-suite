-- CreateEnum
CREATE TYPE "StructuredLogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateTable
CREATE TABLE "StructuredLogEntry" (
    "id" TEXT NOT NULL,
    "level" "StructuredLogLevel" NOT NULL DEFAULT 'INFO',
    "source" TEXT NOT NULL,
    "projectId" TEXT,
    "workItemId" TEXT,
    "agentRunId" TEXT,
    "runtimeId" TEXT,
    "userId" TEXT,
    "agentType" TEXT,
    "eventType" TEXT NOT NULL,
    "message" TEXT,
    "correlationId" TEXT,
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StructuredLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StructuredLogEntry_projectId_occurredAt_idx" ON "StructuredLogEntry"("projectId", "occurredAt");
CREATE INDEX "StructuredLogEntry_eventType_occurredAt_idx" ON "StructuredLogEntry"("eventType", "occurredAt");
CREATE INDEX "StructuredLogEntry_source_occurredAt_idx" ON "StructuredLogEntry"("source", "occurredAt");
CREATE INDEX "StructuredLogEntry_level_occurredAt_idx" ON "StructuredLogEntry"("level", "occurredAt");
CREATE INDEX "StructuredLogEntry_correlationId_occurredAt_idx" ON "StructuredLogEntry"("correlationId", "occurredAt");
CREATE INDEX "StructuredLogEntry_workItemId_occurredAt_idx" ON "StructuredLogEntry"("workItemId", "occurredAt");
CREATE INDEX "StructuredLogEntry_agentRunId_occurredAt_idx" ON "StructuredLogEntry"("agentRunId", "occurredAt");
CREATE INDEX "StructuredLogEntry_runtimeId_occurredAt_idx" ON "StructuredLogEntry"("runtimeId", "occurredAt");