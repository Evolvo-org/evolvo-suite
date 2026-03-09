-- CreateTable
CREATE TABLE "SystemQueueLimits" (
    "id" TEXT NOT NULL,
    "maxPlanning" INTEGER NOT NULL,
    "maxReadyForDev" INTEGER NOT NULL,
    "maxInDev" INTEGER NOT NULL,
    "maxReadyForReview" INTEGER NOT NULL,
    "maxInReview" INTEGER NOT NULL,
    "maxReadyForRelease" INTEGER NOT NULL,
    "maxReviewRetries" INTEGER NOT NULL,
    "maxMergeConflictRetries" INTEGER NOT NULL,
    "maxRuntimeRetries" INTEGER NOT NULL,
    "maxAmbiguityRetries" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemQueueLimits_pkey" PRIMARY KEY ("id")
);
