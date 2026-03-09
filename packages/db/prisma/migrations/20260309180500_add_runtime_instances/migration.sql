-- CreateEnum
CREATE TYPE "RuntimeStatus" AS ENUM ('IDLE', 'BUSY', 'DEGRADED');

-- CreateTable
CREATE TABLE "RuntimeInstance" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "RuntimeStatus" NOT NULL DEFAULT 'IDLE',
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activeJobSummary" TEXT,
    "lastAction" TEXT,
    "lastError" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuntimeInstance_pkey" PRIMARY KEY ("id")
);
