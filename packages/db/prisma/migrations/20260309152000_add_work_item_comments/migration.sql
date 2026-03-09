-- CreateEnum
CREATE TYPE "WorkItemCommentActorType" AS ENUM ('HUMAN', 'AGENT', 'SYSTEM');

-- CreateTable
CREATE TABLE "WorkItemComment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "actorType" "WorkItemCommentActorType" NOT NULL DEFAULT 'HUMAN',
    "actorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkItemComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkItemComment_projectId_createdAt_idx" ON "WorkItemComment"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkItemComment_workItemId_createdAt_idx" ON "WorkItemComment"("workItemId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkItemComment" ADD CONSTRAINT "WorkItemComment_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
