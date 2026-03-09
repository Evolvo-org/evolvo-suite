-- CreateEnum
CREATE TYPE "WorkItemState" AS ENUM ('INBOX', 'PLANNING', 'READY_FOR_DEV', 'IN_DEV', 'READY_FOR_REVIEW', 'IN_REVIEW', 'READY_FOR_RELEASE', 'REQUIRES_HUMAN_INTERVENTION', 'RELEASED');

-- AlterTable
ALTER TABLE "WorkItem" ADD COLUMN     "state" "WorkItemState" NOT NULL DEFAULT 'INBOX',
ADD COLUMN     "stateUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "WorkItemStateTransition" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "fromState" "WorkItemState" NOT NULL,
    "toState" "WorkItemState" NOT NULL,
    "reason" TEXT,
    "isOperatorOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkItemStateTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkItemStateTransition_projectId_createdAt_idx" ON "WorkItemStateTransition"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkItemStateTransition_workItemId_createdAt_idx" ON "WorkItemStateTransition"("workItemId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkItem_projectId_state_sortOrder_idx" ON "WorkItem"("projectId", "state", "sortOrder");

-- AddForeignKey
ALTER TABLE "WorkItemStateTransition" ADD CONSTRAINT "WorkItemStateTransition_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
