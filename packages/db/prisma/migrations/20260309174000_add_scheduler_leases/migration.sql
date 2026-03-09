-- CreateEnum
CREATE TYPE "SchedulerLeaseLane" AS ENUM ('DEV', 'REVIEW', 'RELEASE');

-- CreateEnum
CREATE TYPE "SchedulerLeaseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'RELEASED', 'RECOVERED');

-- CreateTable
CREATE TABLE "WorkItemLease" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "lane" "SchedulerLeaseLane" NOT NULL,
    "status" "SchedulerLeaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "leaseToken" TEXT NOT NULL,
    "leasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "renewedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "recoveryReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkItemLease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkItemLease_leaseToken_key" ON "WorkItemLease"("leaseToken");

-- CreateIndex
CREATE INDEX "WorkItemLease_projectId_status_expiresAt_idx" ON "WorkItemLease"("projectId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "WorkItemLease_runtimeId_status_expiresAt_idx" ON "WorkItemLease"("runtimeId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "WorkItemLease_workItemId_status_expiresAt_idx" ON "WorkItemLease"("workItemId", "status", "expiresAt");

-- AddForeignKey
ALTER TABLE "WorkItemLease" ADD CONSTRAINT "WorkItemLease_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
