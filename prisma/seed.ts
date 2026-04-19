import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ORG_ID   = "cmo4yeb130001q18w7lpcy09s";
const USER_ID  = "cmo4yeazv0000q18w4c2zm7dt";
const ORG_NAME = "Acme Corp";

// ── helpers ───────────────────────────────────────────────────────────────────
const d = (iso: string) => new Date(iso);

async function main() {
  console.log("🌱 Seeding database…");

  // 1. Update org name
  await db.organisation.update({
    where: { id: ORG_ID },
    data: { name: ORG_NAME },
  });
  console.log("  ✓ Organisation:", ORG_NAME);

  // 2. Wipe existing project data under this org so re-running is safe
  await db.alert.deleteMany({ where: { organisationId: ORG_ID } });
  await db.guardianReport.deleteMany({
    where: { project: { organisationId: ORG_ID } },
  });
  await db.risk.deleteMany({ where: { project: { organisationId: ORG_ID } } });
  await db.feature.deleteMany({
    where: { sprint: { project: { organisationId: ORG_ID } } },
  });
  await db.sprint.deleteMany({ where: { project: { organisationId: ORG_ID } } });
  await db.phase.deleteMany({ where: { project: { organisationId: ORG_ID } } });
  await db.project.deleteMany({ where: { organisationId: ORG_ID } });
  console.log("  ✓ Cleared previous project data");

  // ── PROJECT DEFINITIONS ───────────────────────────────────────────────────
  const projectDefs = [
    {
      name:            "Customer Portal v2",
      description:     "Redesign of the self-service customer portal with real-time tracking, invoicing, and support integration.",
      startDate:       "2026-01-15",
      endDate:         "2026-06-30",
      status:          "ACTIVE"  as const,
      budgetTotal:     380_000,
      costActual:      142_000,
      revenueExpected: 520_000,
      healthScore:     74,
      phases: [
        { label: "Discovery & UX",     sub: "6 weeks",  accent: "#2563EB" },
        { label: "Core Development",   sub: "10 weeks", accent: "#059669" },
        { label: "QA & Launch",        sub: "4 weeks",  accent: "#D97706" },
      ],
      risks: [
        { title: "API latency from legacy backend",  probability: 4, impact: 4, category: "Technical",      status: "OPEN"      as const, mitigation: "Add caching layer and circuit breaker" },
        { title: "Stakeholder scope creep",           probability: 3, impact: 3, category: "Scope",          status: "OPEN"      as const, mitigation: "Weekly sign-off on scope baseline" },
        { title: "UX approval delays",               probability: 2, impact: 3, category: "Process",        status: "MITIGATED" as const, mitigation: "Design reviews moved to async Figma comments" },
        { title: "Third-party payment integration",  probability: 3, impact: 5, category: "Technical",      status: "OPEN"      as const, mitigation: "Sandbox testing phase extended by 2 weeks" },
      ],
      guardian: {
        healthScore: 74, healthStatus: "ON_TRACK",
        insight: "Sprint velocity is steady at 42 pts/sprint. Budget burn is within 5% of plan. Two open risks require attention.",
        recommendation: "Resolve API latency risk before Sprint 4. Consider adding 1 backend engineer.",
        riskFlag: false, confidence: 0.81, alertCount: 2,
      },
    },
    {
      name:            "ERP Migration",
      description:     "Full migration from legacy SAP to Microsoft Dynamics 365, including data cleansing, staff training and cutover.",
      startDate:       "2025-11-01",
      endDate:         "2026-08-31",
      status:          "ACTIVE"  as const,
      budgetTotal:     750_000,
      costActual:      398_000,
      revenueExpected: 0,
      healthScore:     58,
      phases: [
        { label: "Discovery & Mapping", sub: "8 weeks",  accent: "#DC2626" },
        { label: "Data Migration",      sub: "14 weeks", accent: "#2563EB" },
        { label: "Training & Parallel", sub: "8 weeks",  accent: "#D97706" },
      ],
      risks: [
        { title: "Data quality issues in legacy ERP",  probability: 5, impact: 5, category: "Data",        status: "OPEN"      as const, mitigation: "Dedicated data cleansing team allocated" },
        { title: "Staff resistance to new system",     probability: 4, impact: 3, category: "People",      status: "OPEN"      as const, mitigation: "Change management programme started" },
        { title: "Vendor delivery delays",             probability: 3, impact: 4, category: "Vendor",      status: "OPEN"      as const, mitigation: "Contractual SLA penalties in place" },
        { title: "Budget overrun",                     probability: 4, impact: 4, category: "Financial",   status: "OPEN"      as const, mitigation: "Monthly budget reviews with CFO" },
        { title: "Cutover downtime risk",              probability: 3, impact: 5, category: "Technical",   status: "MITIGATED" as const, mitigation: "Phased cutover plan approved, parallel run for 4 weeks" },
      ],
      guardian: {
        healthScore: 58, healthStatus: "AT_RISK",
        insight: "Budget CPI at 0.89 — spending faster than planned. Data migration phase is 9 days behind schedule. 4 open risks.",
        recommendation: "Escalate data quality risk to steering committee. Add 2 data engineers to accelerate cleansing.",
        riskFlag: true, confidence: 0.76, alertCount: 4,
      },
    },
    {
      name:            "Data Warehouse Modernisation",
      description:     "Build a centralised data platform on Snowflake with dbt transformations, replacing 14 siloed reporting systems.",
      startDate:       "2026-03-01",
      endDate:         "2026-09-30",
      status:          "ACTIVE"  as const,
      budgetTotal:     290_000,
      costActual:      44_000,
      revenueExpected: 0,
      healthScore:     88,
      phases: [
        { label: "Architecture & Setup", sub: "5 weeks",  accent: "#059669" },
        { label: "ETL Pipelines",        sub: "12 weeks", accent: "#2563EB" },
        { label: "BI & Dashboards",      sub: "6 weeks",  accent: "#7C3AED" },
      ],
      risks: [
        { title: "Source system access delays",      probability: 3, impact: 3, category: "Dependencies", status: "OPEN"      as const, mitigation: "Pre-agreed access request process with IT" },
        { title: "Data governance gaps",             probability: 2, impact: 4, category: "Compliance",   status: "OPEN"      as const, mitigation: "DPO review scheduled for week 6" },
        { title: "Snowflake cost overrun",           probability: 2, impact: 3, category: "Financial",    status: "MITIGATED" as const, mitigation: "Usage alerts configured at 80% threshold" },
      ],
      guardian: {
        healthScore: 88, healthStatus: "ON_TRACK",
        insight: "Project is 2 weeks in and tracking perfectly against plan. Spend is minimal and within forecast.",
        recommendation: "No immediate action required. Ensure data governance review happens on schedule.",
        riskFlag: false, confidence: 0.89, alertCount: 1,
      },
    },
    {
      name:            "Mobile App — iOS",
      description:     "Native iOS companion app for field technicians: work order management, offline sync, photo capture and signature collection.",
      startDate:       "2026-02-01",
      endDate:         "2026-05-31",
      status:          "PAUSED"  as const,
      budgetTotal:     220_000,
      costActual:      118_000,
      revenueExpected: 340_000,
      healthScore:     41,
      phases: [
        { label: "UX & Prototype",  sub: "4 weeks",  accent: "#7C3AED" },
        { label: "Development",     sub: "10 weeks", accent: "#2563EB" },
        { label: "TestFlight & App Store", sub: "4 weeks", accent: "#059669" },
      ],
      risks: [
        { title: "App Store review rejection",     probability: 3, impact: 4, category: "External",    status: "OPEN"      as const, mitigation: "Pre-submission checklist aligned with Apple guidelines" },
        { title: "Offline sync conflicts",         probability: 4, impact: 4, category: "Technical",   status: "OPEN"      as const, mitigation: "Conflict resolution strategy documented" },
        { title: "Key developer departure",        probability: 2, impact: 5, category: "People",      status: "OPEN"      as const, mitigation: "Pair programming and knowledge transfer sessions" },
        { title: "Device compatibility issues",    probability: 3, impact: 3, category: "Technical",   status: "MITIGATED" as const, mitigation: "Minimum iOS 16 target, XCTest on 5 device types" },
      ],
      guardian: {
        healthScore: 41, healthStatus: "CRITICAL",
        insight: "Project paused due to key developer illness. Sprint 3 deliverables missed. Budget CPI at 0.72.",
        recommendation: "Bring in a contractor iOS developer. Re-baseline the schedule. Consider scope reduction.",
        riskFlag: true, confidence: 0.71, alertCount: 5,
      },
    },
  ];

  // ── Feature templates per sprint ──────────────────────────────────────────
  function sprintFeatures(projectName: string, phaseIdx: number, sprintIdx: number) {
    const pools: Record<string, string[][]> = {
      "Customer Portal v2": [
        ["User authentication & SSO", "Customer dashboard layout", "Invoice listing API", "Notification centre shell", "Session management"],
        ["Invoice PDF generation", "Payment method selector", "Support ticket widget", "Real-time status updates (WebSocket)", "Mobile responsive layout", "Accessibility audit fixes"],
        ["Case management API", "Escalation workflow", "SLA timer component", "Email notification triggers"],
        ["End-to-end test suite", "Performance baseline (Lighthouse)", "Browser compatibility matrix", "Bug bash findings", "UAT sign-off docs"],
        ["Production deployment runbook", "Feature flag cleanup", "Monitoring dashboards", "Post-launch analytics", "Documentation site", "Hotfix process definition"],
        ["Search & filter improvements", "Bulk invoice download", "Dark mode toggle", "Keyboard shortcuts"],
      ],
      "ERP Migration": [
        ["Legacy schema analysis", "Field mapping spreadsheet", "Data dictionary v1", "Gap analysis report", "Stakeholder sign-off"],
        ["Master data extraction scripts", "Customer data cleansing", "Vendor records dedup", "Chart of accounts mapping"],
        ["GL migration batch 1", "AP/AR migration batch 1", "Delta sync script", "Rollback procedure docs", "Migration validation report"],
        ["Fixed assets migration", "Inventory records", "Historical transactions (2y)", "Open POs migration"],
        ["Train-the-trainer sessions", "End-user workbooks", "Helpdesk scripts", "UAT environment setup", "Parallel run monitoring"],
        ["Cutover checklist", "Go/no-go criteria", "Hypercare support plan", "Legacy system archival"],
      ],
      "Data Warehouse Modernisation": [
        ["Snowflake account provisioning", "dbt project scaffold", "CI/CD pipeline setup", "Data contract template", "Schema naming conventions"],
        ["CRM source connector", "ERP source connector", "Incremental load strategy", "PII masking framework"],
        ["Sales pipeline model", "Revenue recognition model", "Customer 360 model", "Data tests & expectations"],
        ["Churn prediction dataset", "Marketing attribution model", "Finance reporting layer", "Data catalogue entries"],
        ["Executive summary dashboard (Tableau)", "Sales ops dashboard", "Finance monthly close pack"],
        ["Performance benchmarks", "Cost optimisation review", "BI training sessions", "Documentation handover"],
      ],
      "Mobile App — iOS": [
        ["User journey mapping", "Wireframes v1", "Design system tokens", "Prototype in Figma", "Stakeholder feedback session"],
        ["Project scaffolding (Swift)", "Auth (Clerk SDK)", "Work order list view", "Offline data store (Core Data)"],
        ["Work order detail screen", "Photo capture & upload", "Signature collection", "Status update API calls", "Push notifications"],
        ["Offline sync engine", "Conflict resolution UI", "Background sync", "Battery optimisation"],
        ["TestFlight build", "Crash reporting setup", "Beta tester feedback", "App Store screenshots"],
        ["App Store submission", "Post-launch monitoring", "v1.1 bug fixes backlog"],
      ],
    };
    const flat = pools[projectName] ?? [];
    const idx  = phaseIdx * 2 + sprintIdx;
    return (flat[idx] ?? flat[0] ?? ["Feature A", "Feature B", "Feature C"]).map((title, i) => ({
      title,
      status:         (i === 0 ? "DONE" : i === 1 ? "IN_PROGRESS" : "TODO") as "DONE" | "IN_PROGRESS" | "TODO" | "BLOCKED",
      priority:       (i === 0 ? "HIGH" : i % 3 === 0 ? "CRITICAL" : "MEDIUM") as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      estimatedHours: [8, 13, 8, 5, 13, 8][i % 6],
      actualHours:    i === 0 ? [8, 12, 7, 5, 14, 9][i % 6] : 0,
      order:          i,
    }));
  }

  // ── Create each project ───────────────────────────────────────────────────
  for (const def of projectDefs) {
    const project = await db.project.create({
      data: {
        name:            def.name,
        description:     def.description,
        startDate:       d(def.startDate),
        endDate:         d(def.endDate),
        status:          def.status,
        budgetTotal:     def.budgetTotal,
        costActual:      def.costActual,
        revenueExpected: def.revenueExpected,
        healthScore:     def.healthScore,
        requestedById:   USER_ID,
        organisationId:  ORG_ID,
      },
    });

    // Phases
    const pStart = new Date(def.startDate);
    const totalWeeks = Math.round((new Date(def.endDate).getTime() - pStart.getTime()) / 604_800_000);
    const weeksPerPhase = Math.floor(totalWeeks / def.phases.length);

    for (let pi = 0; pi < def.phases.length; pi++) {
      const ph    = def.phases[pi];
      const phStart = new Date(pStart.getTime() + pi * weeksPerPhase * 604_800_000);
      const phEnd   = new Date(phStart.getTime() + weeksPerPhase * 604_800_000);

      const phase = await db.phase.create({
        data: {
          num:       pi + 1,
          label:     ph.label,
          sub:       ph.sub,
          accent:    ph.accent,
          order:     pi,
          projectId: project.id,
        },
      });

      // 2 sprints per phase
      for (let si = 0; si < 2; si++) {
        const sprintNum   = pi * 2 + si + 1;
        const sprintStart = new Date(phStart.getTime() + si * (weeksPerPhase / 2) * 604_800_000);
        const sprintEnd   = new Date(sprintStart.getTime() + (weeksPerPhase / 2) * 604_800_000);
        const isFirst     = pi === 0;
        const sprintStatus = si === 0 && pi === 0 ? "DONE"
                           : si === 1 && pi === 0 ? "ACTIVE"
                           : "UPCOMING";

        const sprint = await db.sprint.create({
          data: {
            num:       String(sprintNum),
            name:      `Sprint ${sprintNum} — ${ph.label}`,
            goal:      `Deliver ${ph.label.toLowerCase()} objectives for sprint ${sprintNum}`,
            startDate: sprintStart,
            endDate:   sprintEnd,
            status:    sprintStatus as "DONE" | "ACTIVE" | "UPCOMING",
            order:     sprintNum - 1,
            projectId: project.id,
            phaseId:   phase.id,
          },
        });

        // Features
        const features = sprintFeatures(def.name, pi, si);
        for (const feat of features) {
          await db.feature.create({
            data: {
              title:          feat.title,
              status:         feat.status,
              priority:       feat.priority,
              estimatedHours: feat.estimatedHours,
              actualHours:    feat.actualHours,
              order:          feat.order,
              sprintId:       sprint.id,
            },
          });
        }
      }
    }

    // Risks
    for (const risk of def.risks) {
      await db.risk.create({
        data: {
          title:       risk.title,
          probability: risk.probability,
          impact:      risk.impact,
          category:    risk.category,
          status:      risk.status,
          mitigation:  risk.mitigation,
          ownerName:   "Jetmir G.",
          projectId:   project.id,
        },
      });
    }

    // Guardian report
    await db.guardianReport.create({
      data: {
        projectId:      project.id,
        healthScore:    def.guardian.healthScore,
        healthStatus:   def.guardian.healthStatus,
        insight:        def.guardian.insight,
        recommendation: def.guardian.recommendation,
        riskFlag:       def.guardian.riskFlag,
        confidence:     def.guardian.confidence,
        alertCount:     def.guardian.alertCount,
      },
    });

    console.log(`  ✓ Project: ${def.name}`);
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  const allProjects = await db.project.findMany({
    where: { organisationId: ORG_ID },
    select: { id: true, name: true },
  });

  const projectMap = Object.fromEntries(allProjects.map(p => [p.name, p.id]));

  const alertDefs = [
    { project: "ERP Migration",    type: "spi_critical",    level: "critical", title: "SPI below 0.80",                    detail: "Schedule performance is critically below plan. Phase 2 is 9 days behind." },
    { project: "ERP Migration",    type: "budget_critical",  level: "critical", title: "CPI at 0.89 — budget at risk",      detail: "Cost performance index dropped below threshold. Forecast to overspend by $67k." },
    { project: "Mobile App — iOS", type: "at_risk",          level: "critical", title: "Project paused — sprint missed",    detail: "Sprint 3 deliverables missed. Project health critical at 41%." },
    { project: "Mobile App — iOS", type: "blocked",          level: "warning",  title: "3 features blocked",                detail: "Offline sync features blocked pending architecture decision." },
    { project: "Customer Portal v2", type: "overdue",        level: "warning",  title: "Sprint 2 review overdue by 2 days", detail: "Sprint review meeting has not been logged. Please close the sprint." },
    { project: "ERP Migration",    type: "milestone",        level: "warning",  title: "Data migration milestone at risk",  detail: "Batch 1 data migration is 4 days behind planned completion." },
    { project: "Data Warehouse Modernisation", type: "status_change", level: "info", title: "Project entered Build phase", detail: "ETL Pipelines phase started. Architecture approved." },
    { project: "Mobile App — iOS", type: "budget_critical",  level: "critical", title: "Budget burn rate exceeds plan",     detail: "53% of budget consumed with only 40% of work complete." },
  ];

  for (const al of alertDefs) {
    const pid = projectMap[al.project];
    if (!pid) continue;
    await db.alert.create({
      data: {
        organisationId: ORG_ID,
        projectId:      pid,
        type:           al.type,
        level:          al.level,
        title:          al.title,
        detail:         al.detail,
        read:           false,
        resolved:       false,
      },
    });
  }
  console.log(`  ✓ ${alertDefs.length} alerts created`);

  console.log("\n✅ Seed complete!");
  console.log(`   Org: ${ORG_NAME} (${ORG_ID})`);
  console.log(`   Projects: ${projectDefs.length}`);
  console.log(`   User: jetmir.gjeloshi@gmail.com`);
}

main()
  .catch(e => { console.error("Seed failed:", e); process.exit(1); })
  .finally(() => db.$disconnect());
