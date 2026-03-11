-- CreateEnum
CREATE TYPE "RepositorySetupStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ManagementCommandType" AS ENUM ('REPO_CLONE_OR_SYNC');

-- CreateEnum
CREATE TYPE "ManagementCommandStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "repositorySetupStatus" "RepositorySetupStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "repositorySetupMessage" TEXT,
ADD COLUMN "repositorySetupError" TEXT,
ADD COLUMN "repositorySetupUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ManagementCommand" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "commandType" "ManagementCommandType" NOT NULL,
  "status" "ManagementCommandStatus" NOT NULL DEFAULT 'PENDING',
  "requestedBy" TEXT,
  "runtimeId" TEXT,
  "argsJson" JSONB NOT NULL,
  "activeStage" TEXT,
  "statusSummary" TEXT,
  "resultJson" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ManagementCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManagementCommand_projectId_createdAt_idx" ON "ManagementCommand"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ManagementCommand_status_createdAt_idx" ON "ManagementCommand"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ManagementCommand_runtimeId_createdAt_idx" ON "ManagementCommand"("runtimeId", "createdAt");

-- AddForeignKey
ALTER TABLE "ManagementCommand"
ADD CONSTRAINT "ManagementCommand_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementCommand"
ADD CONSTRAINT "ManagementCommand_runtimeId_fkey"
FOREIGN KEY ("runtimeId") REFERENCES "RuntimeInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;