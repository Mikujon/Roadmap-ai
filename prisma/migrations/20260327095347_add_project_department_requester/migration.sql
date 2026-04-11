-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "requestedById" TEXT;

-- CreateTable
CREATE TABLE "project_departments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "project_departments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_departments_projectId_departmentId_key" ON "project_departments"("projectId", "departmentId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_departments" ADD CONSTRAINT "project_departments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_departments" ADD CONSTRAINT "project_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
