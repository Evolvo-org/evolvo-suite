-- CreateEnum
CREATE TYPE "HumanInterventionStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "HumanInterventionCase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "status" "HumanInterventionStatus" NOT NULL DEFAULT 'OPEN',
    "summary" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "attemptsMade" TEXT,
    "evidence" TEXT,
    "suggestedAction" TEXT,
    "resolutionNotes" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HumanInterventionCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HumanInterventionCase_projectId_status_createdAt_idx" ON "HumanInterventionCase"("projectId", "status", "createdAt");
CREATE INDEX "HumanInterventionCase_workItemId_createdAt_idx" ON "HumanInterventionCase"("workItemId", "createdAt");

-- AddForeignKey
ALTER TABLE "HumanInterventionCase" ADD CONSTRAINT "HumanInterventionCase_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
