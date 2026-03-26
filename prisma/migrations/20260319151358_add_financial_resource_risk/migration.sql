-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATED', 'CLOSED');

-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "features" ADD COLUMN     "actualHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "budgetTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "costActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "endDateForecast" TIMESTAMP(3),
ADD COLUMN     "healthScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "revenueExpected" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "costPerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capacityHours" DOUBLE PRECISION NOT NULL DEFAULT 160,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organisationId" TEXT NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_assignments" (
    "id" TEXT NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,

    CONSTRAINT "resource_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "probability" INTEGER NOT NULL DEFAULT 3,
    "impact" INTEGER NOT NULL DEFAULT 3,
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "mitigation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resource_assignments_projectId_resourceId_key" ON "resource_assignments"("projectId", "resourceId");

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
