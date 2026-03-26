-- CreateTable
CREATE TABLE "project_dependencies" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,

    CONSTRAINT "project_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_dependencies" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,

    CONSTRAINT "feature_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_dependencies_projectId_dependsOnId_key" ON "project_dependencies"("projectId", "dependsOnId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_dependencies_featureId_dependsOnId_key" ON "feature_dependencies"("featureId", "dependsOnId");

-- AddForeignKey
ALTER TABLE "project_dependencies" ADD CONSTRAINT "project_dependencies_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_dependencies" ADD CONSTRAINT "project_dependencies_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_dependencies" ADD CONSTRAINT "feature_dependencies_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_dependencies" ADD CONSTRAINT "feature_dependencies_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;
