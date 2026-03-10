-- CreateEnum
CREATE TYPE "WorktreeStatus" AS ENUM ('PENDING', 'ACTIVE', 'LOCKED_BY_DEV', 'LOCKED_BY_REVIEW', 'LOCKED_BY_RELEASE', 'STALE', 'CLEANUP_PENDING', 'ARCHIVED', 'FAILED');

-- CreateTable
CREATE TABLE "Worktree" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "runtimeId" TEXT,
    "leaseId" TEXT,
    "status" "WorktreeStatus" NOT NULL DEFAULT 'PENDING',
    "path" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "baseBranch" TEXT NOT NULL,
    "headSha" TEXT,
    "pullRequestUrl" TEXT,
    "isDirty" BOOLEAN NOT NULL DEFAULT false,
    "details" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cleanupRequestedAt" TIMESTAMP(3),
    "cleanupCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worktree_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Worktree_workItemId_key" ON "Worktree"("workItemId");

-- CreateIndex
CREATE INDEX "Worktree_projectId_status_updatedAt_idx" ON "Worktree"("projectId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Worktree_runtimeId_updatedAt_idx" ON "Worktree"("runtimeId", "updatedAt");

-- CreateIndex
CREATE INDEX "Worktree_leaseId_updatedAt_idx" ON "Worktree"("leaseId", "updatedAt");

-- AddForeignKey
ALTER TABLE "Worktree" ADD CONSTRAINT "Worktree_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worktree" ADD CONSTRAINT "Worktree_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "RuntimeInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worktree" ADD CONSTRAINT "Worktree_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "WorkItemLease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
