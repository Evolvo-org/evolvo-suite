-- CreateEnum
CREATE TYPE "PlanningApprovalAuditAction" AS ENUM ('APPROVED');

-- AlterTable
ALTER TABLE "DevelopmentPlan"
ADD COLUMN     "planningApprovedVersionId" TEXT,
ADD COLUMN     "planningApprovedAt" TIMESTAMP(3),
ADD COLUMN     "planningApprovedBy" TEXT,
ADD COLUMN     "planningApprovalSummary" TEXT;

-- CreateTable
CREATE TABLE "DevelopmentPlanApprovalAudit" (
    "id" TEXT NOT NULL,
    "developmentPlanId" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "action" "PlanningApprovalAuditAction" NOT NULL DEFAULT 'APPROVED',
    "actorName" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevelopmentPlanApprovalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevelopmentPlan_planningApprovedVersionId_key" ON "DevelopmentPlan"("planningApprovedVersionId");

-- CreateIndex
CREATE INDEX "DevelopmentPlanApprovalAudit_developmentPlanId_createdAt_idx" ON "DevelopmentPlanApprovalAudit"("developmentPlanId", "createdAt");

-- CreateIndex
CREATE INDEX "DevelopmentPlanApprovalAudit_planVersionId_createdAt_idx" ON "DevelopmentPlanApprovalAudit"("planVersionId", "createdAt");

-- AddForeignKey
ALTER TABLE "DevelopmentPlan" ADD CONSTRAINT "DevelopmentPlan_planningApprovedVersionId_fkey" FOREIGN KEY ("planningApprovedVersionId") REFERENCES "PlanVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentPlanApprovalAudit" ADD CONSTRAINT "DevelopmentPlanApprovalAudit_developmentPlanId_fkey" FOREIGN KEY ("developmentPlanId") REFERENCES "DevelopmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentPlanApprovalAudit" ADD CONSTRAINT "DevelopmentPlanApprovalAudit_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;