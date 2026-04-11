-- ── Sprint 3: Domain Events, Outbox, GuardianReport fix, Alert.resolved, RLS
-- Migration: 20260409000001_sprint3_events_rls

-- ── 1. Fix GuardianReport table ──────────────────────────────────────────
-- Rename table and replace columns to match new schema
DO $$
BEGIN
  -- Add new columns if not present (idempotent)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'GuardianReport' AND column_name = 'healthStatus') THEN
    ALTER TABLE "GuardianReport"
      ADD COLUMN "healthStatus"   TEXT    NOT NULL DEFAULT 'UNKNOWN',
      ADD COLUMN "insight"        TEXT    NOT NULL DEFAULT '',
      ADD COLUMN "recommendation" TEXT    NOT NULL DEFAULT '',
      ADD COLUMN "riskFlag"       BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN "confidence"     FLOAT   NOT NULL DEFAULT 0,
      ADD COLUMN "alertCount"     INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Rename to snake_case map
ALTER TABLE IF EXISTS "GuardianReport" RENAME TO "guardian_reports";

-- Drop old columns that no longer exist in schema
ALTER TABLE IF EXISTS "guardian_reports"
  DROP COLUMN IF EXISTS "riskLevel",
  DROP COLUMN IF EXISTS "onTrackProbability",
  DROP COLUMN IF EXISTS "estimatedDelay",
  DROP COLUMN IF EXISTS "alerts",
  DROP COLUMN IF EXISTS "recommendations",
  DROP COLUMN IF EXISTS "summary",
  DROP COLUMN IF EXISTS "generatedAt";

-- ── 2. Alert: add resolved + rename table ─────────────────────────────────
ALTER TABLE IF EXISTS "Alert"
  ADD COLUMN IF NOT EXISTS "resolved" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS "Alert" RENAME TO "alerts";

-- Recreate index on new table name
DROP INDEX IF EXISTS "Alert_organisationId_idx";
DROP INDEX IF EXISTS "Alert_projectId_idx";
DROP INDEX IF EXISTS "Alert_createdAt_idx";

CREATE INDEX IF NOT EXISTS "alerts_organisation_id_idx" ON "alerts"("organisationId");
CREATE INDEX IF NOT EXISTS "alerts_project_id_idx"      ON "alerts"("projectId");
CREATE INDEX IF NOT EXISTS "alerts_created_at_idx"      ON "alerts"("createdAt");

-- ── 3. ProjectSnapshot: rename table ─────────────────────────────────────
ALTER TABLE IF EXISTS "ProjectSnapshot" RENAME TO "project_snapshots";

DROP INDEX IF EXISTS "ProjectSnapshot_projectId_idx";
CREATE INDEX IF NOT EXISTS "project_snapshots_project_id_idx" ON "project_snapshots"("projectId");

-- ── 4. Domain Events table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "domain_events" (
  "id"             TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "type"           TEXT        NOT NULL,
  "aggregateType"  TEXT        NOT NULL,
  "aggregateId"    TEXT        NOT NULL,
  "organisationId" TEXT        NOT NULL,
  "projectId"      TEXT,
  "actorId"        TEXT,
  "actorName"      TEXT,
  "payload"        JSONB       NOT NULL DEFAULT '{}',
  "occurredAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "domain_events_org_idx"  ON "domain_events"("organisationId");
CREATE INDEX IF NOT EXISTS "domain_events_agg_idx"  ON "domain_events"("aggregateId");
CREATE INDEX IF NOT EXISTS "domain_events_time_idx" ON "domain_events"("organisationId", "occurredAt" DESC);

-- ── 5. Outbox Events table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "outbox_events" (
  "id"            TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "domainEventId" TEXT        NOT NULL UNIQUE REFERENCES "domain_events"("id") ON DELETE CASCADE,
  "queue"         TEXT        NOT NULL,
  "jobName"       TEXT        NOT NULL,
  "payload"       JSONB       NOT NULL DEFAULT '{}',
  "processedAt"   TIMESTAMPTZ,
  "attempts"      INTEGER     NOT NULL DEFAULT 0,
  "lastError"     TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "outbox_events_pending_idx" ON "outbox_events"("processedAt") WHERE "processedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "outbox_events_created_idx" ON "outbox_events"("createdAt");

-- ── 6. PostgreSQL Row-Level Security ─────────────────────────────────────
-- Each table is protected so queries only see rows belonging to the
-- current organisation. The app sets: SET LOCAL app.organisation_id = '...'
-- at the start of each transaction via the withOrgContext() helper.
--
-- IMPORTANT: The Prisma DB user must NOT be a superuser (superusers bypass RLS).
-- Create a limited role: CREATE ROLE roadmap_app LOGIN PASSWORD '...' NOSUPERUSER;

-- Projects
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_org_isolation" ON "projects";
CREATE POLICY "projects_org_isolation" ON "projects"
  USING ("organisationId" = current_setting('app.organisation_id', TRUE));

-- Sprints (via project join — use EXISTS subquery for performance)
ALTER TABLE "sprints" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sprints_org_isolation" ON "sprints";
CREATE POLICY "sprints_org_isolation" ON "sprints"
  USING (EXISTS (
    SELECT 1 FROM "projects" p
    WHERE p."id" = "sprints"."projectId"
      AND p."organisationId" = current_setting('app.organisation_id', TRUE)
  ));

-- Features
ALTER TABLE "features" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "features_org_isolation" ON "features";
CREATE POLICY "features_org_isolation" ON "features"
  USING (EXISTS (
    SELECT 1 FROM "sprints" s
    JOIN "projects" p ON p."id" = s."projectId"
    WHERE s."id" = "features"."sprintId"
      AND p."organisationId" = current_setting('app.organisation_id', TRUE)
  ));

-- Risks
ALTER TABLE "risks" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "risks_org_isolation" ON "risks";
CREATE POLICY "risks_org_isolation" ON "risks"
  USING (EXISTS (
    SELECT 1 FROM "projects" p
    WHERE p."id" = "risks"."projectId"
      AND p."organisationId" = current_setting('app.organisation_id', TRUE)
  ));

-- Alerts
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "alerts_org_isolation" ON "alerts";
CREATE POLICY "alerts_org_isolation" ON "alerts"
  USING ("organisationId" = current_setting('app.organisation_id', TRUE));

-- Domain Events
ALTER TABLE "domain_events" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "domain_events_org_isolation" ON "domain_events";
CREATE POLICY "domain_events_org_isolation" ON "domain_events"
  USING ("organisationId" = current_setting('app.organisation_id', TRUE));

-- Members
ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_org_isolation" ON "members";
CREATE POLICY "members_org_isolation" ON "members"
  USING ("organisationId" = current_setting('app.organisation_id', TRUE));

-- Resources
ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resources_org_isolation" ON "resources";
CREATE POLICY "resources_org_isolation" ON "resources"
  USING ("organisationId" = current_setting('app.organisation_id', TRUE));

-- ResourceAssignments (via project)
ALTER TABLE "resource_assignments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resource_assignments_org_isolation" ON "resource_assignments";
CREATE POLICY "resource_assignments_org_isolation" ON "resource_assignments"
  USING (EXISTS (
    SELECT 1 FROM "projects" p
    WHERE p."id" = "resource_assignments"."projectId"
      AND p."organisationId" = current_setting('app.organisation_id', TRUE)
  ));

-- Activities
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activities_org_isolation" ON "activities";
CREATE POLICY "activities_org_isolation" ON "activities"
  USING ("organisationId" = current_setting('app.organisation_id', TRUE));

-- Guardian Reports (via project)
ALTER TABLE "guardian_reports" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guardian_reports_org_isolation" ON "guardian_reports";
CREATE POLICY "guardian_reports_org_isolation" ON "guardian_reports"
  USING (EXISTS (
    SELECT 1 FROM "projects" p
    WHERE p."id" = "guardian_reports"."projectId"
      AND p."organisationId" = current_setting('app.organisation_id', TRUE)
  ));

-- ── 7. Helper function: set org context ──────────────────────────────────
-- Call this at the start of every transaction: SELECT set_org_context('org_xxx');
CREATE OR REPLACE FUNCTION set_org_context(org_id TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.organisation_id', org_id, TRUE); -- TRUE = local to transaction
END;
$$;
