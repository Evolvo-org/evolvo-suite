-- CreateEnum
CREATE TYPE "RuntimeArtifactType" AS ENUM ('LOG', 'PATCH', 'TEST_REPORT', 'BUILD_OUTPUT', 'RELEASE_NOTE', 'OTHER');

-- CreateTable
CREATE TABLE "RuntimeArtifact" (
    "id" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "artifactType" "RuntimeArtifactType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuntimeArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RuntimeArtifact_storageKey_key" ON "RuntimeArtifact"("storageKey");

-- CreateIndex
CREATE INDEX "RuntimeArtifact_runtimeId_createdAt_idx" ON "RuntimeArtifact"("runtimeId", "createdAt");

-- CreateIndex
CREATE INDEX "RuntimeArtifact_leaseId_createdAt_idx" ON "RuntimeArtifact"("leaseId", "createdAt");

-- AddForeignKey
ALTER TABLE "RuntimeArtifact" ADD CONSTRAINT "RuntimeArtifact_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "RuntimeInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuntimeArtifact" ADD CONSTRAINT "RuntimeArtifact_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "WorkItemLease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
