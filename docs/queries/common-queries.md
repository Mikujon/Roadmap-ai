# Common Prisma Queries

Patterns used repeatedly across the codebase. All queries are automatically scoped to an organisation via `organisationId` — never query project data without this filter.

---

## Projects

### List active projects for an org (sidebar)

```typescript
const projects = await db.project.findMany({
  where:   { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED"] } },
  orderBy: { updatedAt: "desc" },
  take:    10,
});
```

### Full project for EVM computation

Used by `computeEvm()` in `src/app/api/v1/_lib.ts`. The `DB_PROJECT_INCLUDE` constant is shared across all v1 endpoints:

```typescript
import { DB_PROJECT_INCLUDE } from "@/app/api/v1/_lib";

const project = await db.project.findFirst({
  where:   { id, organisationId: orgId },
  include: DB_PROJECT_INCLUDE,
});
// Includes: phases, sprints+features, risks, assignments+resource, guardianReport
```

### Full project for Guardian analysis

```typescript
const project = await db.project.findFirst({
  where: { id: projectId, organisationId: orgId },
  include: {
    phases:      { orderBy: { order: "asc" } },
    sprints:     { include: { features: true }, orderBy: { order: "asc" } },
    risks:       { where: { status: "OPEN" } },
    assignments: { include: { resource: true } },
    statusLogs:  { orderBy: { createdAt: "desc" }, take: 10 },
    snapshots:   { orderBy: { version: "desc" }, take: 1 },
  },
});
```

---

## Health Score Computation Pattern

The same pattern appears in layout.tsx (sidebar dots), closure-report route, and guardian.ts. Always compute costs from assignments, never store them on the project:

```typescript
const allF       = project.sprints.flatMap(s => s.features);
const done       = allF.filter(f => f.status === "DONE").length;
const blocked    = allF.filter(f => f.status === "BLOCKED").length;
const inProg     = allF.filter(f => f.status === "IN_PROGRESS").length;
const costActual = project.assignments.reduce((s, a) => s + a.actualHours    * a.resource.costPerHour, 0);
const costEst    = project.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
const openRisks  = project.risks.filter(r => r.status === "OPEN");
const highRisks  = openRisks.filter(r => r.probability * r.impact >= 9);
const maxRisk    = openRisks.reduce((m, r) => Math.max(m, r.probability * r.impact), 0);

const h = calculateHealth({
  startDate: project.startDate, endDate: project.endDate,
  totalFeatures: allF.length, doneFeatures: done,
  blockedFeatures: blocked, inProgressFeatures: inProg,
  totalSprints: project.sprints.length,
  doneSprints:  project.sprints.filter(s => s.status === "DONE").length,
  activeSprints: project.sprints.filter(s => s.status === "ACTIVE").length,
  budgetTotal: project.budgetTotal, costActual, costEstimated: costEst,
  totalCapacityHours: project.assignments.reduce((s, a) => s + a.resource.capacityHours, 0),
  totalActualHours:   project.assignments.reduce((s, a) => s + a.actualHours, 0),
  openRisks: openRisks.length, highRisks: highRisks.length, maxRiskScore: maxRisk,
});
```

---

## Alerts

### Unresolved alerts for an org

```typescript
const alerts = await db.alert.findMany({
  where:   { organisationId: orgId, resolved: false },
  orderBy: { createdAt: "desc" },
  take:    20,
});
```

### Critical alerts for CEO dashboard

```typescript
const critical = await db.alert.findMany({
  where:   { organisationId: orgId, level: "critical", resolved: false },
  orderBy: { createdAt: "desc" },
  take:    5,
});
```

### Mark alert read

```typescript
await db.alert.update({
  where: { id: alertId },
  data:  { read: true },
});
```

---

## Risks

### Open risks by project, sorted by score

```typescript
const risks = await db.risk.findMany({
  where:   { projectId: id },
  orderBy: [{ probability: "desc" }, { impact: "desc" }],
});
```

### Create risk from AI

```typescript
const risk = await db.risk.create({
  data: {
    projectId:   projectId,
    title:       "...",
    description: "...",
    probability: 4,
    impact:      3,
    category:    "TECHNICAL",
    mitigation:  "...",
    status:      "OPEN",
    ownerName:   "AI Assistant",
  },
});
```

---

## Snapshots

### Latest snapshot version

```typescript
const last = await db.projectSnapshot.findFirst({
  where:   { projectId },
  orderBy: { version: "desc" },
  select:  { version: true },
});
const version = (last?.version ?? 0) + 1;
```

---

## Guardian Report

### Upsert after analysis

```typescript
await db.guardianReport.upsert({
  where:  { projectId },
  create: { projectId, healthScore, healthStatus, insight, recommendation, riskFlag, confidence, alertCount },
  update: { healthScore, healthStatus, insight, recommendation, riskFlag, confidence, alertCount, updatedAt: new Date() },
});
```

### Check cache freshness (2h TTL)

```typescript
const cached = await db.guardianReport.findUnique({ where: { projectId } });
if (cached) {
  const ageHours = (Date.now() - cached.updatedAt.getTime()) / (1000 * 60 * 60);
  if (ageHours < 2) return cached; // cache hit
}
```

---

## Organisation

### Fetch UI config

```typescript
const orgConfig = await db.organisation.findUnique({
  where:  { id: ctx.org.id },
  select: { uiPrimaryColor: true, uiCompactMode: true, uiTheme: true,
            uiLanguage: true, uiCurrency: true, uiDateFormat: true, uiDefaultRole: true },
});
```

### Validate MCP API key

```typescript
const org = await db.organisation.findUnique({
  where: { apiKey: bearerToken },
  select: { id: true, name: true },
});
if (!org) return 401;
if (org.id !== body.orgId) return 403; // cross-org injection attempt
```

---

## Activity Log

Always use `logActivity()` from `src/lib/activity.ts` — it never throws:

```typescript
import { logActivity } from "@/lib/activity";

await logActivity({
  organisationId: ctx.org.id,
  projectId:      id,
  userId:         ctx.user.id,
  userName:       ctx.user.name ?? "Unknown",
  action:         "project.status_changed",
  entity:         "project",
  entityId:       id,
  entityName:     project.name,
  meta:           { from: "ACTIVE", to: "COMPLETED" },
});
```

---

## Ambient Messages (MCP Ingestion Log)

```typescript
const log = await db.ambientMessage.findMany({
  where:   { organisationId: orgId },
  orderBy: { createdAt: "desc" },
  take:    20,
  include: { project: { select: { id: true, name: true } } },
});
```
