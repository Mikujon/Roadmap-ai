-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "entity" TEXT,
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityName" TEXT,
ADD COLUMN     "organisationId" TEXT,
ADD COLUMN     "userName" TEXT;

-- CreateIndex
CREATE INDEX "activities_organisationId_idx" ON "activities"("organisationId");

-- CreateIndex
CREATE INDEX "activities_projectId_idx" ON "activities"("projectId");
