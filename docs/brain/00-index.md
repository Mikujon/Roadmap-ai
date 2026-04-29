# RoadmapAI Brain — Index

This folder contains the authoritative decision-making knowledge base for the Guardian AI and all autonomous reasoning in the platform. Each file defines rules, thresholds, formulas, and escalation logic that the AI uses when analysing projects, generating reports, and advising PMs.

**Do not modify these files without a PMO review.** They encode PMI PMBOK 7th Ed, ISO 21502, and Gartner PPM standards as adapted for this platform.

---

## Files

| File | Topic | Purpose |
|------|-------|---------|
| [01-evm-engine.md](01-evm-engine.md) | EVM / Health Score | Formulas, thresholds, composite scoring |
| [02-alert-logic.md](02-alert-logic.md) | Alert Engine | Conditions, dedup rules, severity levels |
| [03-scenarios-blocking.md](03-scenarios-blocking.md) | Blocking Scenarios | How to detect and handle blocked work |
| [04-scenarios-governance.md](04-scenarios-governance.md) | Governance Scenarios | Approval flows, compliance checks |
| [05-roles-behaviour.md](05-roles-behaviour.md) | Role Behaviour | What each role sees, can do, expects |
| [06-risk-engine.md](06-risk-engine.md) | Risk Engine | Scoring, classification, response strategies |
| [07-report-templates.md](07-report-templates.md) | Report Templates | Guardian report sections, FA templates |
| [08-escalation-logic.md](08-escalation-logic.md) | Escalation Logic | When to escalate, to whom, by what channel |
| [09-ambient-intelligence.md](09-ambient-intelligence.md) | Ambient Intelligence | MCP ingestion, signal classification |
| [10-documents-lifecycle.md](10-documents-lifecycle.md) | Documents Lifecycle | Document states, approval flows |
| [11-portfolio-logic.md](11-portfolio-logic.md) | Portfolio Logic | Cross-project KPIs, exposure, prioritisation |
| [12-methodology-advisor.md](12-methodology-advisor.md) | Methodology Advisor | Agile, Waterfall, Hybrid guidance |
| [13-kpi-calculations.md](13-kpi-calculations.md) | KPI Calculations | All formulas with worked examples |
| [14-communication-types.md](14-communication-types.md) | Communication Types | Meeting types, cadences, escalation channels |
| [15-onboarding-scenarios.md](15-onboarding-scenarios.md) | Onboarding Scenarios | New org, new project, new member flows |

---

## Reasoning Hierarchy

When Guardian AI evaluates a project, it applies knowledge in this order:

1. **EVM metrics** (01) — objective, formula-driven signals
2. **Alert conditions** (02) — threshold crossings trigger discrete alerts
3. **Blocking scenarios** (03) — contextual analysis of stuck work
4. **Risk exposure** (06) — probability × impact matrix
5. **Governance gaps** (04) — missing approvals, overdue documents
6. **Portfolio context** (11) — relative to other projects in the org
7. **Role-appropriate output** (05) — filter recommendations by audience

---

## Versioning

These docs follow the platform schema version. When Prisma models change in ways that affect health scoring (e.g. new `FeatureStatus` values, new risk categories), update the relevant brain files in the same PR.
