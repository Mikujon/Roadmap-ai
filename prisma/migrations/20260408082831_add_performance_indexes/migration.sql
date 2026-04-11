-- CreateIndex
CREATE INDEX "activities_organisationId_createdAt_idx" ON "activities"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "features_sprintId_idx" ON "features"("sprintId");

-- CreateIndex
CREATE INDEX "features_sprintId_status_idx" ON "features"("sprintId", "status");

-- CreateIndex
CREATE INDEX "projects_organisationId_idx" ON "projects"("organisationId");

-- CreateIndex
CREATE INDEX "projects_organisationId_status_idx" ON "projects"("organisationId", "status");

-- CreateIndex
CREATE INDEX "projects_updatedAt_idx" ON "projects"("updatedAt");

-- CreateIndex
CREATE INDEX "risks_projectId_idx" ON "risks"("projectId");

-- CreateIndex
CREATE INDEX "risks_projectId_status_idx" ON "risks"("projectId", "status");

-- CreateIndex
CREATE INDEX "sprints_projectId_idx" ON "sprints"("projectId");

-- CreateIndex
CREATE INDEX "sprints_projectId_status_idx" ON "sprints"("projectId", "status");
