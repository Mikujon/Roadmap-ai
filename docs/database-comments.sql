-- ============================================================
-- RoadmapAI — PostgreSQL Semantic Comments
-- Purpose: Enable AI SQL tools (MindsDB, pgvector, ChatDB)
--          to understand schema without external documentation.
-- Run: once on DB setup, re-run after schema changes.
-- All column names use double quotes for case-sensitivity.
-- ============================================================

-- ── ORGANISATIONS ──────────────────────────────────────────
COMMENT ON TABLE organisations IS
'Top-level tenant entity. Each organisation is an isolated workspace.
All data is scoped by organisationId — never query across orgs.
Billing is per-org via Stripe. Auth via Clerk organisations.';

COMMENT ON COLUMN organisations.id IS
'CUID primary key. Use this for all foreign key references.';

COMMENT ON COLUMN organisations."clerkOrgId" IS
'Clerk organisation ID (org_xxx). Used for auth context resolution.
Maps to Clerk webhook payload: data.id on organisation events.';

COMMENT ON COLUMN organisations.slug IS
'URL-safe org identifier. Used in: roadmapai.com/[slug].
Must be unique. Auto-generated from name on creation.';

COMMENT ON COLUMN organisations."subscriptionStatus" IS
'Stripe subscription state. Values: TRIAL | ACTIVE | PAST_DUE | CANCELLED.
TRIAL: free tier with limits. ACTIVE: paid plan.
PAST_DUE: payment failed, grace period. CANCELLED: access revoked.';

COMMENT ON COLUMN organisations."brandColor" IS
'Hex color for document branding (e.g. #006D6B).
Applied to: PDF exports, email templates, shared project views.';

COMMENT ON COLUMN organisations."documentHeader" IS
'Custom text for branded document headers.
Format: "Company Name | Address | Website"';

COMMENT ON COLUMN organisations."documentFooter" IS
'Custom text for branded document footers.
Format: "Confidential | Page N of M"';

COMMENT ON COLUMN organisations."logoUrl" IS
'URL to organisation logo. Used in branded PDF exports and shared views.';

COMMENT ON COLUMN organisations."slackTeamId" IS
'Slack workspace ID for ambient intelligence integration.
Set when org connects Slack via OAuth.';

COMMENT ON COLUMN organisations."gmailEmail" IS
'Gmail address being monitored for ambient intelligence.
Set when org connects Gmail via OAuth.';

-- ── USERS ──────────────────────────────────────────────────
COMMENT ON TABLE users IS
'Platform users. Each user belongs to one or more organisations via members table.
Created/updated via Clerk webhooks (user.created, user.updated).
preferredView controls which dashboard role they see.';

COMMENT ON COLUMN users."clerkId" IS
'Clerk user ID (user_xxx). Primary link between Clerk auth and DB user.
Used in getAuthContext() to resolve user context on every request.';

COMMENT ON COLUMN users."preferredView" IS
'Active dashboard role. Values: PMO | CEO | STK | DEV.
PMO: full operational view. CEO: portfolio/financial summary.
STK: only their projects. DEV: only their assigned tasks.
Changed via PATCH /api/users/me. Persisted across sessions.';

COMMENT ON COLUMN users."avatarUrl" IS
'Profile picture URL from Clerk. Auto-synced on user.updated webhook.';

-- ── MEMBERS ────────────────────────────────────────────────
COMMENT ON TABLE members IS
'Junction table: user <-> organisation with role.
One user can be member of multiple orgs with different roles.
Role determines permissions via can.* functions in lib/permissions.ts.';

COMMENT ON COLUMN members.role IS
'Org-level role. Values: ADMIN | MANAGER | VIEWER.
ADMIN: full access including billing and team management.
MANAGER: create/edit projects, cannot manage billing/team.
VIEWER: read-only access to assigned projects.';

COMMENT ON COLUMN members."joinedAt" IS
'When the user accepted the invitation and joined the org.';

-- ── PROJECTS ───────────────────────────────────────────────
COMMENT ON TABLE projects IS
'Core project entity. Central to all EVM calculations and Guardian AI analysis.
Each project belongs to one organisation. Status drives visibility:
ACTIVE/PLANNING/ON_HOLD shown in portfolio and sidebar.
COMPLETED/CANCELLED/ARCHIVED shown only in archive.

EVM baseline: budgetTotal=BAC (Budget at Completion).
Health is auto-calculated by Guardian AI via lib/health.ts.
Never manually set healthScore — always let the engine calculate it.';

COMMENT ON COLUMN projects."budgetTotal" IS
'BAC (Budget at Completion) — total approved budget in base currency.
EVM formula: EV = budgetTotal * (progressPct / 100).
Update only via budget_updates approval workflow, not directly.
Zero means no budget set — EVM cost metrics will be skipped.';

COMMENT ON COLUMN projects."costActual" IS
'AC (Actual Cost) — sum of resource_assignments.actualHours * resource.costPerHour.
Auto-calculated by EVM engine. Do not update manually.
Used in: CPI = EV/AC. If AC=0, CPI defaults to 1.0.';

COMMENT ON COLUMN projects."healthScore" IS
'Composite PMO score 0-100. Auto-calculated by calculateHealth() in lib/health.ts.
Formula: Schedule(35%) + Cost(30%) + Scope(20%) + Risk(15%).
Thresholds: >=70=ON_TRACK, 50-69=AT_RISK, <50=OFF_TRACK.
Updated by Guardian AI agent on every significant project change.
Do not set manually — Guardian AI owns this field.';

COMMENT ON COLUMN projects.status IS
'Project lifecycle status. Values:
PLANNING: not yet started, in preparation.
ACTIVE: currently being executed, Sprint active.
ON_HOLD: temporarily paused, resources released.
COMPLETED: delivered successfully, moves to archive.
CANCELLED: terminated before completion, moves to archive.
ARCHIVED: manually archived by admin.
Archive filter: status IN (COMPLETED, CANCELLED, ARCHIVED).';

COMMENT ON COLUMN projects."revenueExpected" IS
'Expected revenue/value from project delivery.
Used for: ROI = (revenueExpected - EAC) / EAC * 100.
Optional. Zero means not tracked.';

COMMENT ON COLUMN projects."shareToken" IS
'Unique token for public read-only project sharing.
Access via: /share/[shareToken]. No auth required.
Enabled only when shareEnabled=true.';

COMMENT ON COLUMN projects."endDateForecast" IS
'AI-calculated forecast end date based on current velocity.
Updated by Guardian AI. Compare to endDate to calculate delayDays.
Formula: delayDays = max(0, endDateForecast - endDate) in days.';

COMMENT ON COLUMN projects."briefText" IS
'Original project brief from creation wizard step 1.
Used by Guardian AI for context in analysis and document generation.
Also fed to functional analysis generation.';

COMMENT ON COLUMN projects."organisationId" IS
'Foreign key to organisations.id. All project data is org-scoped.
Never return projects without filtering by organisationId.';

COMMENT ON COLUMN projects."requestedById" IS
'User ID of the stakeholder who requested this project.
Used for: stakeholder dashboard filtering (show only their projects).';

-- ── PHASES ─────────────────────────────────────────────────
COMMENT ON TABLE phases IS
'Project phases — high-level groupings of sprints.
Ordered by "order" field (0-indexed). Rendered as timeline bars.
Dates are calculated dynamically from project dates, not stored.
Each phase typically contains 2 sprints (configurable).';

COMMENT ON COLUMN phases.num IS
'Display number (1-indexed). Used in: "Phase 1 — Planning".';

COMMENT ON COLUMN phases.label IS
'Phase name. Common values: Planning, Design, Development, QA, Launch.';

COMMENT ON COLUMN phases.accent IS
'Hex color for timeline bar. Auto-assigned on creation.
Sequence: #2563EB, #D97706, #059669, #7C3AED, #0D9488.';

COMMENT ON COLUMN phases."projectId" IS
'Foreign key to projects.id.';

COMMENT ON COLUMN phases."order" IS
'Zero-indexed sort order within the project. Phase 1 = order 0.';

-- ── SPRINTS ────────────────────────────────────────────────
COMMENT ON TABLE sprints IS
'2-week work iterations within a phase. Core unit of schedule tracking.
status=ACTIVE: current sprint (max 1 per project at a time).
Velocity = features completed. SPI uses sprint completion rate.';

COMMENT ON COLUMN sprints.status IS
'Sprint lifecycle. Values: UPCOMING | ACTIVE | DONE | CANCELLED.
Only ONE sprint per project should be ACTIVE at a time.
ACTIVE to DONE transition triggers Guardian AI re-analysis.';

COMMENT ON COLUMN sprints.num IS
'Display number as string (e.g. "1.1", "1.2", "2.1").
Format: [phaseNum].[sprintWithinPhase]. Used for display only.';

COMMENT ON COLUMN sprints.goal IS
'Sprint goal statement. Describes what must be completed this sprint.
Used in: sprint planning, Guardian AI context, closure reports.';

COMMENT ON COLUMN sprints."startDate" IS
'Sprint start date. Used for: timeline display, velocity calculation.';

COMMENT ON COLUMN sprints."endDate" IS
'Sprint end date. If today > endDate and status=ACTIVE: sprint is overdue.';

-- ── FEATURES ───────────────────────────────────────────────
COMMENT ON TABLE features IS
'Tasks/user stories within a sprint. Atomic unit of work.
Progress = doneFeatures / totalFeatures * 100.
EVM Earned Value = budgetTotal * progress.
Blocked features directly impact SPI and health score.';

COMMENT ON COLUMN features.status IS
'Task status. Values: TODO | IN_PROGRESS | IN_REVIEW | DONE | BLOCKED | CANCELLED.
BLOCKED: critical — triggers Guardian AI alert and SPI penalty.
DONE: counted in EVM earned value calculation.
Changing to DONE triggers: EVM recalculation, Guardian AI analysis.';

COMMENT ON COLUMN features.priority IS
'Task priority. Values: LOW | MEDIUM | HIGH | CRITICAL.
CRITICAL+BLOCKED combination triggers immediate escalation alert.';

COMMENT ON COLUMN features.module IS
'Optional feature category/module tag (e.g. "Auth", "Dashboard", "API").
Used for: grouping in backlog view, filtering in board.';

COMMENT ON COLUMN features."estimatedHours" IS
'Planned effort in hours. Used for resource utilization calculation.
Team utilization = sum(actualHours) / sum(estimatedHours * capacity) * 100.';

COMMENT ON COLUMN features."actualHours" IS
'Hours actually spent on this feature. Updated via timesheet or manual entry.';

COMMENT ON COLUMN features."assignedToId" IS
'User ID of assigned developer. Used for DEV dashboard filtering.
DEV role sees only features where assignedToId = their userId.';

COMMENT ON COLUMN features."sprintId" IS
'Foreign key to sprints.id. Feature belongs to exactly one sprint.
Moving feature between sprints triggers Guardian AI re-analysis.';

-- ── RISKS ──────────────────────────────────────────────────
COMMENT ON TABLE risks IS
'Project risk register. PMI/ISO 31000 compliant.
Risk score = probability * impact (1-25 scale).
Score thresholds: >=15=CRITICAL, >=10=HIGH, >=5=MEDIUM, <5=LOW.
Guardian AI monitors open risks and suggests mitigations.';

COMMENT ON COLUMN risks.probability IS
'Likelihood of risk occurring. Scale 1-5:
1=Unlikely, 2=Possible, 3=Likely, 4=Very likely, 5=Almost certain.';

COMMENT ON COLUMN risks.impact IS
'Business impact if risk materialises. Scale 1-5:
1=Minimal, 2=Minor, 3=Moderate, 4=Significant, 5=Catastrophic.
Risk score = probability * impact. Max = 25.';

COMMENT ON COLUMN risks.status IS
'Risk lifecycle. Values: OPEN | MITIGATED | CLOSED | ACCEPTED.
OPEN: active risk requiring attention.
MITIGATED: mitigation plan applied, monitoring continues.
CLOSED: risk no longer applicable.
ACCEPTED: risk acknowledged, no action taken (documented decision).';

COMMENT ON COLUMN risks.mitigation IS
'Planned mitigation actions. Free text describing how risk will be managed.
AI can suggest mitigations via /api/projects/[id]/risks/suggest-mitigation.';

COMMENT ON COLUMN risks.category IS
'Risk category. Values: TECHNICAL | RESOURCES | DEPENDENCY | 
QUALITY | SCOPE | FINANCIAL.';

-- ── ALERTS ─────────────────────────────────────────────────
COMMENT ON TABLE alerts IS
'Guardian AI generated notifications and system alerts.
Shown in notification drawer and /alerts page.
level drives urgency: CRITICAL > WARNING > INFO > SUCCESS.
Auto-created by: Guardian AI agent, EVM thresholds, blocked features.';

COMMENT ON COLUMN alerts.level IS
'Alert urgency. Values: CRITICAL | WARNING | INFO | SUCCESS.
CRITICAL: requires immediate action (SPI<0.5, budget critical, overdue).
WARNING: requires attention within 48h.
INFO: informational, no action required.
SUCCESS: positive milestone achieved.';

COMMENT ON COLUMN alerts.type IS
'Alert source category. Values:
GUARDIAN: created by Guardian AI analysis.
EVM: triggered by EVM threshold breach.
SCOPE_CHANGE: pending scope change approval.
BUDGET_UPDATE: pending budget change approval.
BLOCKED: feature blocked trigger.
MENTION: user @mentioned in project chat.
AMBIENT_INTELLIGENCE: from external channel analysis.';

COMMENT ON COLUMN alerts.action IS
'CTA button label shown in alert UI.
Examples: "Review", "Approve", "Escalate", "View board".
Maps to navigation or modal action in frontend.';

COMMENT ON COLUMN alerts."requiresValidation" IS
'If true: alert requires PMO approval before dismissal.
Used for: AI-generated decisions, scope changes, budget updates.';

COMMENT ON COLUMN alerts.read IS
'Whether the alert has been read by the user.
Unread count shown as badge on notification bell icon.';

COMMENT ON COLUMN alerts."emailSent" IS
'Whether an email notification was sent for this alert.
Prevents duplicate emails on re-analysis.';

-- ── RESOURCE_ASSIGNMENTS ───────────────────────────────────
COMMENT ON TABLE resource_assignments IS
'Many-to-many: project <-> resource with hours tracking.
Used for: team utilization calculation, cost calculation.
costActual = sum(actualHours * resource.costPerHour) per project.
utilization = sum(actualHours) / sum(resource.capacityHours) * 100.';

COMMENT ON COLUMN resource_assignments."estimatedHours" IS
'Planned hours for this resource on this project.
Used in: EV calculation, utilization planning.';

COMMENT ON COLUMN resource_assignments."actualHours" IS
'Hours actually logged. Updated via timesheet or manual entry.
Used in: AC calculation, CPI = EV/AC.';

-- ── RESOURCES ──────────────────────────────────────────────
COMMENT ON TABLE resources IS
'Team members / contractors available for assignment.
Not the same as users — a resource can be external (no login).
costPerHour used for EVM cost calculations.';

COMMENT ON COLUMN resources."costPerHour" IS
'Billing rate in org currency. Used for AC calculation.
For internal staff: use loaded cost (salary + overhead).
For contractors: use contract rate.';

COMMENT ON COLUMN resources."capacityHours" IS
'Weekly available hours for this resource.
Used for: utilization = actualHours / capacityHours * 100.
Standard: 40h/week full-time, 20h/week part-time.';

-- ── GUARDIAN_REPORTS ───────────────────────────────────────
COMMENT ON TABLE guardian_reports IS
'One-per-project Guardian AI analysis report.
Upserted (not inserted) on each Guardian AI run.
Contains latest AI assessment of project health.
healthScore here matches projects.healthScore — both updated together.';

COMMENT ON COLUMN guardian_reports."healthScore" IS
'PMO composite score 0-100. Identical to projects.healthScore.
Stored here for historical reference and report generation.';

COMMENT ON COLUMN guardian_reports.confidence IS
'AI confidence in analysis (0.0-1.0).
<0.6: insufficient data, use rule-based fallback.
>=0.6: AI analysis used. >=0.85: high confidence.';

COMMENT ON COLUMN guardian_reports."generatedAt" IS
'Timestamp of last Guardian AI analysis run.
Used by dashboard to show "Last updated X minutes ago".
Also used to determine if re-analysis is needed (stale if >1h old).';

COMMENT ON COLUMN guardian_reports.insight IS
'One-sentence Guardian AI summary of project status.
Shown in: dashboard decisions feed, portfolio table, project overview.';

COMMENT ON COLUMN guardian_reports.recommendation IS
'Top recommended action from Guardian AI.
Shown in: alerts, decision cards, Guardian panel.';

-- ── PROJECT_SNAPSHOTS ──────────────────────────────────────
COMMENT ON TABLE project_snapshots IS
'Point-in-time project state captures (version control for projects).
Auto-created on: project creation (v1), scope changes, budget changes.
Manual creation available in governance tab.
data JSON contains full project state at snapshot time.
Used for: rollback, comparison, audit, closure report baseline.';

COMMENT ON COLUMN project_snapshots.version IS
'Sequential version number. v1 = initial baseline at project creation.
Incremented on each snapshot. Used for display: "Snapshot v3".';

COMMENT ON COLUMN project_snapshots.reason IS
'Why this snapshot was created. Values:
PROJECT_CREATED | SCOPE_CHANGED | BUDGET_UPDATED | 
SPRINT_CLOSED | MANUAL | PRE_CLOSURE.';

COMMENT ON COLUMN project_snapshots.data IS
'Full project state JSON at snapshot time. Includes:
name, dates, budgetTotal, phases count, sprint statuses,
feature counts by status, risk counts, team composition.
Used for: diff comparison, closure report generation.';

-- ── ACTIVITIES ─────────────────────────────────────────────
COMMENT ON TABLE activities IS
'Complete audit trail of all project changes.
Never deleted. Used for: change log, audit reports, AI context.
action field uses SCREAMING_SNAKE_CASE convention.
Common actions: PROJECT_CREATED, FEATURE_UPDATED, RISK_ADDED,
SPRINT_CLOSED, SCOPE_CHANGED, BUDGET_UPDATED, GUARDIAN_ANALYSIS.';

COMMENT ON COLUMN activities.action IS
'What happened. SCREAMING_SNAKE_CASE.
Examples: PROJECT_CREATED, FEATURE_STATUS_CHANGED, RISK_ADDED,
SPRINT_CLOSED, BUDGET_UPDATED, SCOPE_CHANGE_APPROVED.';

COMMENT ON COLUMN activities.entity IS
'Type of entity that changed. Values: project | sprint | feature | 
risk | budget | scope | team | document | snapshot.';

COMMENT ON COLUMN activities."entityId" IS
'ID of the specific record that changed.';

COMMENT ON COLUMN activities.meta IS
'JSON with additional context about the change.
Example: { "oldStatus": "TODO", "newStatus": "DONE", "sprintId": "xxx" }';

-- ── FUNCTIONAL_ANALYSES ────────────────────────────────────
COMMENT ON TABLE functional_analyses IS
'AI-generated functional analysis document per project.
One per project (unique constraint on projectId).
Approval workflow: DRAFT → PENDING_APPROVAL → APPROVED | REJECTED.
Version history in fa_versions table.';

COMMENT ON COLUMN functional_analyses.status IS
'Approval workflow state. Values:
DRAFT: being edited, not yet submitted.
PENDING_APPROVAL: submitted, awaiting approver action.
APPROVED: signed off, locked for editing.
REJECTED: rejected, can be revised.
REVISION_REQUESTED: sent back with comments for revision.';

COMMENT ON COLUMN functional_analyses.content IS
'Structured FA document as JSON. Schema:
{ projectScope, objectives[], stakeholders[], 
  functionalRequirements[], nonFunctionalRequirements[],
  outOfScope[], assumptions[], constraints[], 
  processFlow[], glossary[] }';

COMMENT ON COLUMN functional_analyses."videoUrl" IS
'Path to uploaded project brief video.
Local: /public/uploads/[orgId]/[projectId]/brief-video.[ext]
TODO: migrate to S3/Cloudflare R2 for production.
Used by AI analysis to extract scope from video.';

COMMENT ON COLUMN functional_analyses.version IS
'Current version number. Incremented on each approved revision.
Matches latest fa_versions.version for this analysis.';

-- ── FA_VERSIONS ────────────────────────────────────────────
COMMENT ON TABLE fa_versions IS
'Version history for functional analyses.
Created each time a functional analysis is approved or revised.
Allows viewing and comparing previous versions.';

-- ── PROJECT_MESSAGES ───────────────────────────────────────
COMMENT ON TABLE project_messages IS
'Internal project chat messages.
type=TEXT: regular user message.
type=SYSTEM: auto-generated (e.g. "Laura approved scope change").
type=COMMAND: slash command result (/status, /risk, etc).
mentions array stores userIds of @mentioned users.
Each mention creates an Alert record (type=MENTION).';

COMMENT ON COLUMN project_messages.type IS
'Message type. Values: TEXT | SYSTEM | COMMAND.
SYSTEM: auto-generated by Guardian AI or workflow events.
COMMAND: result of slash commands like /status or /risk.';

COMMENT ON COLUMN project_messages.mentions IS
'Array of userIds mentioned with @ in this message.
Each mention triggers: Alert created, notification sent.';

COMMENT ON COLUMN project_messages."replyToId" IS
'If set: this message is a reply to another message.
Used for: threaded conversations within project chat.';

-- ── PROJECT_DOCUMENTS ──────────────────────────────────────
COMMENT ON TABLE project_documents IS
'All documents associated with a project.
Auto-created on project creation: PROJECT_CHARTER, RISK_REGISTER, RACI_MATRIX.
FUNCTIONAL_ANALYSIS created separately via FA workflow.
content JSON stores structured document data.
fileUrl used for uploaded files (PDFs, Word docs).';

COMMENT ON COLUMN project_documents.type IS
'Document type. Values:
PROJECT_CHARTER | FUNCTIONAL_ANALYSIS | RISK_REGISTER |
RACI_MATRIX | CLOSURE_REPORT | MEETING_NOTES | CUSTOM.';

COMMENT ON COLUMN project_documents.version IS
'Document version number. Incremented on each revision.
v1 = initial auto-generated document at project creation.';

COMMENT ON COLUMN project_documents.status IS
'Document status. Values: DRAFT | PENDING_APPROVAL | APPROVED | ARCHIVED.';

-- ── DOMAIN_EVENTS ──────────────────────────────────────────
COMMENT ON TABLE domain_events IS
'Event sourcing log for all significant business events.
Partitioned by month (domain_events_2026_02, etc).
Used for: audit, replay, MindsDB time-series analysis.
All writes go through outbox_events for guaranteed delivery.';

COMMENT ON COLUMN domain_events.type IS
'Event type in dot notation. Examples:
project.created, feature.status.changed, risk.added,
sprint.closed, budget.updated, guardian.analysis.completed.';

COMMENT ON COLUMN domain_events."aggregateType" IS
'The root entity type. Values: project | organisation | user | sprint.';

COMMENT ON COLUMN domain_events.payload IS
'Full event data as JSON. Contains all context needed to process the event.
Used for: event replay, audit reconstruction, AI context.';

-- ── INVITATIONS ────────────────────────────────────────────
COMMENT ON TABLE invitations IS
'Pending org membership invitations.
token is a nanoid(32) sent in the invitation email URL.
Acceptance flow: /invite/[token] → sign up/in → member created.
Expires after 7 days. Can be resent (updates expiresAt).';

COMMENT ON COLUMN invitations.token IS
'Unique nanoid(32) token. Sent in invitation email URL.
URL format: /invite/[token]. Single-use, expires after 7 days.';

COMMENT ON COLUMN invitations.status IS
'Invitation state. Values: PENDING | ACCEPTED | EXPIRED | CANCELLED.
PENDING: waiting for recipient to accept.
ACCEPTED: member record created, invitation consumed.';

-- ============================================================
-- VIEWS for AI SQL queries (MindsDB friendly)
-- ============================================================

CREATE OR REPLACE VIEW project_health_summary AS
SELECT
  p.id,
  p.name,
  p.status,
  p."healthScore",
  p."budgetTotal" AS bac,
  p."costActual" AS ac,
  p."startDate",
  p."endDate",
  p."endDateForecast",
  p."organisationId",
  gr.insight AS guardian_insight,
  gr.recommendation AS guardian_recommendation,
  gr."generatedAt" AS last_analysis,
  CASE
    WHEN p."healthScore" >= 70 THEN 'ON_TRACK'
    WHEN p."healthScore" >= 50 THEN 'AT_RISK'
    ELSE 'OFF_TRACK'
  END AS health_status,
  EXTRACT(DAY FROM (p."endDate" - NOW())) AS days_remaining,
  EXTRACT(DAY FROM (COALESCE(p."endDateForecast", p."endDate") - p."endDate")) AS forecast_delay_days
FROM projects p
LEFT JOIN guardian_reports gr ON gr."projectId" = p.id
WHERE p.status NOT IN ('COMPLETED', 'CANCELLED', 'ARCHIVED');

COMMENT ON VIEW project_health_summary IS
'Real-time project health dashboard. Use this for portfolio queries.
Includes Guardian AI insights and delay forecasts.
Example: SELECT * FROM project_health_summary WHERE health_status = ''OFF_TRACK''';

CREATE OR REPLACE VIEW portfolio_evm AS
SELECT
  o.name AS organisation,
  COUNT(p.id) AS total_projects,
  COUNT(CASE WHEN p."healthScore" >= 70 THEN 1 END) AS on_track,
  COUNT(CASE WHEN p."healthScore" >= 50 AND p."healthScore" < 70 THEN 1 END) AS at_risk,
  COUNT(CASE WHEN p."healthScore" < 50 THEN 1 END) AS off_track,
  SUM(p."budgetTotal") AS total_bac,
  SUM(p."costActual") AS total_ac,
  ROUND(AVG(p."healthScore")::numeric, 1) AS avg_health_score,
  SUM(p."revenueExpected") AS total_revenue_expected
FROM organisations o
JOIN projects p ON p."organisationId" = o.id
WHERE p.status NOT IN ('COMPLETED', 'CANCELLED', 'ARCHIVED')
GROUP BY o.id, o.name;

COMMENT ON VIEW portfolio_evm IS
'Organisation-level EVM summary for CEO dashboard.
Aggregates all active projects per organisation.
Example: SELECT * FROM portfolio_evm WHERE organisation = ''Acme Corp''';

CREATE OR REPLACE VIEW sprint_velocity AS
SELECT
  s."projectId",
  s.id AS sprint_id,
  s.name AS sprint_name,
  s.status,
  s."startDate",
  s."endDate",
  COUNT(f.id) AS total_features,
  COUNT(CASE WHEN f.status = 'DONE' THEN 1 END) AS done_features,
  COUNT(CASE WHEN f.status = 'BLOCKED' THEN 1 END) AS blocked_features,
  ROUND(
    COUNT(CASE WHEN f.status = 'DONE' THEN 1 END)::numeric /
    NULLIF(COUNT(f.id), 0) * 100, 1
  ) AS completion_pct
FROM sprints s
LEFT JOIN features f ON f."sprintId" = s.id
GROUP BY s.id, s."projectId", s.name, s.status, s."startDate", s."endDate";

COMMENT ON VIEW sprint_velocity IS
'Sprint completion metrics for velocity tracking.
Use for: burndown charts, velocity trending, sprint health.
Example: SELECT * FROM sprint_velocity WHERE "projectId" = ''xxx'' ORDER BY "startDate"';
