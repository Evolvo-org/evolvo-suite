-- CreateEnum
CREATE TYPE "WorkItemRetryCategory" AS ENUM ('REVIEW', 'MERGE_CONFLICT', 'RUNTIME', 'AMBIGUITY');

-- CreateTable
CREATE TABLE "WorkItemRetryState" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "reviewFailureCount" INTEGER NOT NULL DEFAULT 0,
    "mergeConflictFailureCount" INTEGER NOT NULL DEFAULT 0,
    "runtimeFailureCount" INTEGER NOT NULL DEFAULT 0,
    "ambiguityFailureCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailureCategory" "WorkItemRetryCategory",
    "lastFailureMessage" TEXT,
    "lastFailureAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkItemRetryState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkItemRetryState_workItemId_key" ON "WorkItemRetryState"("workItemId");

-- CreateIndex
CREATE INDEX "WorkItemRetryState_projectId_nextRetryAt_idx" ON "WorkItemRetryState"("projectId", "nextRetryAt");

-- CreateIndex
CREATE INDEX "WorkItemRetryState_lastFailureCategory_nextRetryAt_idx" ON "WorkItemRetryState"("lastFailureCategory", "nextRetryAt");

-- AddForeignKey
ALTER TABLE "WorkItemRetryState" ADD CONSTRAINT "WorkItemRetryState_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
