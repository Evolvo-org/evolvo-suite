-- CreateTable
CREATE TABLE "SchedulerLaneCursor" (
    "lane" "SchedulerLeaseLane" NOT NULL,
    "lastProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulerLaneCursor_pkey" PRIMARY KEY ("lane")
);
