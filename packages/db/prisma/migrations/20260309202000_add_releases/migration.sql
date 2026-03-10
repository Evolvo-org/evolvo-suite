-- CreateEnum
CREATE TYPE "ReleaseRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReleaseNoteFormat" AS ENUM ('MARKDOWN', 'PLAIN_TEXT');

-- CreateTable
CREATE TABLE "ReleaseRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "runtimeId" TEXT,
    "leaseId" TEXT,
    "worktreeId" TEXT,
    "status" "ReleaseRunStatus" NOT NULL DEFAULT 'RUNNING',
    "summary" TEXT,
    "errorMessage" TEXT,
    "mergeCommitSha" TEXT,
    "releaseUrl" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseVersion" (
    "id" TEXT NOT NULL,
    "releaseRunId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "tagName" TEXT NOT NULL,
    "targetBranch" TEXT,
    "commitSha" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseNote" (
    "id" TEXT NOT NULL,
    "releaseRunId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "format" "ReleaseNoteFormat" NOT NULL DEFAULT 'MARKDOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReleaseRun_projectId_createdAt_idx" ON "ReleaseRun"("projectId", "createdAt");
CREATE INDEX "ReleaseRun_workItemId_createdAt_idx" ON "ReleaseRun"("workItemId", "createdAt");
CREATE INDEX "ReleaseRun_runtimeId_createdAt_idx" ON "ReleaseRun"("runtimeId", "createdAt");
CREATE INDEX "ReleaseRun_leaseId_createdAt_idx" ON "ReleaseRun"("leaseId", "createdAt");
CREATE INDEX "ReleaseRun_worktreeId_createdAt_idx" ON "ReleaseRun"("worktreeId", "createdAt");
CREATE UNIQUE INDEX "ReleaseVersion_releaseRunId_key" ON "ReleaseVersion"("releaseRunId");
CREATE UNIQUE INDEX "ReleaseNote_releaseRunId_key" ON "ReleaseNote"("releaseRunId");

-- AddForeignKey
ALTER TABLE "ReleaseRun" ADD CONSTRAINT "ReleaseRun_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReleaseRun" ADD CONSTRAINT "ReleaseRun_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "RuntimeInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReleaseRun" ADD CONSTRAINT "ReleaseRun_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "WorkItemLease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReleaseRun" ADD CONSTRAINT "ReleaseRun_worktreeId_fkey" FOREIGN KEY ("worktreeId") REFERENCES "Worktree"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReleaseVersion" ADD CONSTRAINT "ReleaseVersion_releaseRunId_fkey" FOREIGN KEY ("releaseRunId") REFERENCES "ReleaseRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReleaseNote" ADD CONSTRAINT "ReleaseNote_releaseRunId_fkey" FOREIGN KEY ("releaseRunId") REFERENCES "ReleaseRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
