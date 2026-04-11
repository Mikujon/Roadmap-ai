-- CreateTable
CREATE TABLE "GuardianReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "healthScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "onTrackProbability" INTEGER NOT NULL,
    "estimatedDelay" INTEGER NOT NULL,
    "alerts" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "summary" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardianReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuardianReport_projectId_key" ON "GuardianReport"("projectId");

-- AddForeignKey
ALTER TABLE "GuardianReport" ADD CONSTRAINT "GuardianReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
