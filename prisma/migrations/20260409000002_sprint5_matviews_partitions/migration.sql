-- ============================================================
-- Sprint 5: Materialized Views + Partitioned Domain Events
-- ============================================================

-- ── 1. Materialized View: Portfolio Summary ──────────────────────────────
-- Aggregates project health, budget, and risk per organisation.
-- Refreshed every 15 min by the worker; reads go to the replica.

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_portfolio_summary AS
SELECT
  p."organisationId",
  COUNT(*)                                               AS total_projects,
  COUNT(*) FILTER (WHERE p.status = 'ACTIVE')            AS active_projects,
  COUNT(*) FILTER (WHERE p.status = 'COMPLETED')         AS completed_projects,
  COUNT(*) FILTER (WHERE p.status = 'ON_HOLD')           AS on_hold_projects,
  COUNT(*) FILTER (WHERE p.status = 'CLOSED')            AS closed_projects,
  COALESCE(SUM(p."budgetTotal"), 0)                      AS total_budget,
  COALESCE(AVG(gr."healthScore"), 0)::int                AS avg_health_score,
  COUNT(*) FILTER (WHERE gr."healthStatus" = 'AT_RISK')  AS at_risk_projects,
  COUNT(*) FILTER (WHERE gr."riskFlag" = true)           AS flagged_projects,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'OPEN') AS open_risks,
  COALESCE(SUM(gr."alertCount"), 0)                      AS total_alerts,
  NOW()                                                  AS refreshed_at
FROM projects p
LEFT JOIN guardian_reports gr ON gr."projectId" = p.id
LEFT JOIN risks r              ON r."projectId"  = p.id
GROUP BY p."organisationId";

-- Unique index enables CONCURRENTLY refresh (no table lock)
CREATE UNIQUE INDEX IF NOT EXISTS mv_portfolio_summary_org_idx
  ON mv_portfolio_summary ("organisationId");

-- ── 2. Materialized View: Sprint Velocity ────────────────────────────────
-- Per-project sprint completion stats for velocity tracking.

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sprint_velocity AS
SELECT
  s."projectId",
  COUNT(*)                                    AS total_sprints,
  COUNT(*) FILTER (WHERE s.status = 'DONE')  AS completed_sprints,
  ROUND(
    AVG(
      CASE WHEN s.status = 'DONE' THEN
        (
          SELECT COUNT(*)::float FROM features f
          WHERE f."sprintId" = s.id AND f.status = 'DONE'
        ) / NULLIF(
          (SELECT COUNT(*) FROM features f WHERE f."sprintId" = s.id), 0
        )
      END
    )::numeric, 4
  )                                           AS avg_completion_rate,
  COUNT(DISTINCT f.id) FILTER
    (WHERE f.status = 'BLOCKED')             AS total_blocked_features,
  NOW()                                       AS refreshed_at
FROM sprints s
LEFT JOIN features f ON f."sprintId" = s.id
GROUP BY s."projectId";

CREATE UNIQUE INDEX IF NOT EXISTS mv_sprint_velocity_project_idx
  ON mv_sprint_velocity ("projectId");

-- ── 3. Refresh function ───────────────────────────────────────────────────
-- Called by the worker's matview-refresh processor.
-- CONCURRENTLY = no lock on the view during refresh (requires unique index above).

CREATE OR REPLACE FUNCTION refresh_materialized_views(
  p_views TEXT[] DEFAULT NULL   -- NULL means refresh all
)
RETURNS TABLE(view_name TEXT, duration_ms INT) AS $$
DECLARE
  _start TIMESTAMPTZ;
BEGIN
  IF p_views IS NULL OR 'portfolio_summary' = ANY(p_views) THEN
    _start := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_portfolio_summary;
    RETURN QUERY SELECT 'mv_portfolio_summary'::TEXT,
      EXTRACT(MILLISECONDS FROM clock_timestamp() - _start)::INT;
  END IF;

  IF p_views IS NULL OR 'sprint_velocity' = ANY(p_views) THEN
    _start := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sprint_velocity;
    RETURN QUERY SELECT 'mv_sprint_velocity'::TEXT,
      EXTRACT(MILLISECONDS FROM clock_timestamp() - _start)::INT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ── 4. Partition domain_events by month ──────────────────────────────────
-- We convert the existing non-partitioned table to a RANGE-partitioned table.
-- Strategy: rename → create new partitioned → copy → drop old.

-- Step 4a: Rename existing table (keeps data safe during migration)
ALTER TABLE IF EXISTS domain_events RENAME TO domain_events_unpartitioned;

-- Step 4b: Create the new partitioned parent table
CREATE TABLE domain_events (
  id              TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  type            TEXT        NOT NULL,
  "aggregateType" TEXT        NOT NULL,
  "aggregateId"   TEXT        NOT NULL,
  "organisationId" TEXT       NOT NULL,
  "projectId"     TEXT,
  "actorId"       TEXT        NOT NULL,
  "actorName"     TEXT        NOT NULL,
  payload         JSONB       NOT NULL DEFAULT '{}',
  "occurredAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE ("occurredAt");

-- Step 4c: Create initial monthly partitions (past 2 months + next 2 months)
CREATE TABLE domain_events_2026_02 PARTITION OF domain_events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE domain_events_2026_03 PARTITION OF domain_events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE domain_events_2026_04 PARTITION OF domain_events
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE domain_events_2026_05 PARTITION OF domain_events
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Catch-all for any out-of-range rows (safety net)
CREATE TABLE domain_events_default PARTITION OF domain_events DEFAULT;

-- Step 4d: Primary key (must include the partition key)
ALTER TABLE domain_events ADD PRIMARY KEY (id, "occurredAt");

-- Step 4e: Indexes on each partition (inherited automatically in PG 11+)
CREATE INDEX ON domain_events ("organisationId", "occurredAt" DESC);
CREATE INDEX ON domain_events ("projectId",      "occurredAt" DESC) WHERE "projectId" IS NOT NULL;
CREATE INDEX ON domain_events (type,             "occurredAt" DESC);

-- Step 4f: Migrate existing data (ignore if old table doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'domain_events_unpartitioned') THEN
    INSERT INTO domain_events
      SELECT * FROM domain_events_unpartitioned
      ON CONFLICT DO NOTHING;
    DROP TABLE domain_events_unpartitioned;
  END IF;
END $$;

-- Step 4g: Re-enable RLS on the new partitioned table
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY domain_events_org_isolation ON domain_events
  USING ("organisationId" = current_setting('app.organisation_id', TRUE));

-- ── 5. Partition maintenance function ────────────────────────────────────
-- Called monthly by the worker. Creates partitions for the next N months.

CREATE OR REPLACE FUNCTION ensure_domain_event_partitions(
  months_ahead INT DEFAULT 2
)
RETURNS TABLE(partition_name TEXT, created BOOLEAN) AS $$
DECLARE
  _month      DATE;
  _next_month DATE;
  _tbl_name   TEXT;
  _exists     BOOLEAN;
BEGIN
  FOR i IN 0..months_ahead LOOP
    _month      := DATE_TRUNC('month', NOW() + (i || ' months')::INTERVAL);
    _next_month := _month + INTERVAL '1 month';
    _tbl_name   := 'domain_events_' || TO_CHAR(_month, 'YYYY_MM');

    SELECT EXISTS (
      SELECT FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = _tbl_name AND n.nspname = 'public'
    ) INTO _exists;

    IF NOT _exists THEN
      EXECUTE FORMAT(
        'CREATE TABLE %I PARTITION OF domain_events FOR VALUES FROM (%L) TO (%L)',
        _tbl_name, _month, _next_month
      );
      RETURN QUERY SELECT _tbl_name, TRUE;
    ELSE
      RETURN QUERY SELECT _tbl_name, FALSE;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ── 6. Update outbox_events foreign key ──────────────────────────────────
-- The FK to domain_events.id no longer works simply after partitioning
-- (PostgreSQL doesn't support FK references to partitioned tables without the partition key).
-- We drop the FK and rely on application-level consistency instead.

ALTER TABLE outbox_events
  DROP CONSTRAINT IF EXISTS "outbox_events_domainEventId_fkey";
