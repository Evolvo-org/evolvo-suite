-- CreateTable
CREATE TABLE "ProjectAgentRouting" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "defaultProvider" TEXT NOT NULL,
    "defaultModel" TEXT NOT NULL,
    "agentRoutesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAgentRouting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAgentRouting" (
    "id" TEXT NOT NULL,
    "defaultProvider" TEXT NOT NULL,
    "defaultModel" TEXT NOT NULL,
    "agentRoutesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemAgentRouting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAgentRouting_projectId_key" ON "ProjectAgentRouting"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectAgentRouting" ADD CONSTRAINT "ProjectAgentRouting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
