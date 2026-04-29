# Escalation Logic

Escalation is the process of routing a problem to a higher authority or a broader audience because the current responsible party cannot or has not resolved it.

---

## Escalation Levels

| Level | Audience | Channel | Trigger |
|-------|----------|---------|---------|
| 0 — Monitor | PM (self) | Dashboard alert | Warning conditions |
| 1 — PM Action | PMO | In-app notification + alert | Critical alert, any blocker |
| 2 — Management | ADMIN / PMO | Email digest | Critical + duration > 24h unactioned |
| 3 — Executive | CEO | Summary email | Portfolio impact, budget critical |
| 4 — External | Client / Sponsor | Manual (PM action) | Deadline renegotiation needed |

Guardian AI determines the level and routes accordingly in its recommendations.

---

## Escalation Decision Tree

```
New condition detected
  │
  ├─ Level: info → L0. Add to dashboard, no notification.
  │
  ├─ Level: warning
  │    ├─ First occurrence → L1. In-app alert to PMO.
  │    └─ Same warning > 48h unresolved → L2. Email to ADMIN.
  │
  └─ Level: critical
       ├─ Immediate → L2. Email digest (sendAlertEmails).
       ├─ Budget critical → L3. Include in portfolio summary for CEO.
       ├─ Deadline renegotiation needed → L4. Guardian recommends PM action.
       └─ > 3 consecutive critical sprints → L3 + log as project risk.
```

---

## Escalation Conditions by Category

### Schedule Escalation

| Condition | Level | Action |
|-----------|-------|--------|
| SPI 0.8–0.95 | 1 | PM reviews velocity this week |
| SPI 0.5–0.8 | 2 | ADMIN notified, sprint scope review |
| SPI < 0.5 | 3 | CEO summary + emergency scope review |
| Overdue 1–7 days | 2 | PM + ADMIN, renegotiate deadline |
| Overdue > 7 days | 3 | CEO visibility, client communication needed |

### Budget Escalation

| Condition | Level | Action |
|-----------|-------|--------|
| CPI 0.85–0.95 | 1 | Monitor weekly |
| CPI 0.70–0.85 | 2 | ADMIN notified, spending review |
| CPI < 0.70 | 3 | CEO + freeze non-essential spend |
| EAC > BAC + 30% | 3 | Emergency: budget revision required |

### Blocking Escalation

| Condition | Level | Action |
|-----------|-------|--------|
| 1 feature blocked | 1 | PM assigns resolution owner |
| 3+ features blocked | 2 | ADMIN notified, dependency review |
| Blocker > 5 business days | 2 | Escalate to project sponsor |
| Blocker threatens deadline | 3 | CEO if it affects portfolio delivery |

### Governance Escalation

| Condition | Level | Action |
|-----------|-------|--------|
| FA pending approval > 5 days | 1 | Reminder to approver |
| FA pending approval > 10 days | 2 | ADMIN notified |
| Document rejected, no revision > 7 days | 2 | ADMIN + PM action |
| Project CLOSED, no closure report | 1 | System auto-generates, PM reviews |

---

## Guardian AI Escalation Recommendations

When Guardian identifies a condition requiring escalation, recommendations follow this template:

```
[Level N Escalation Required]
Condition: [specific metric or state]
Duration: [how long this has been true]
Impact: [what happens if unaddressed]
Recommended action: [specific next step]
Recommended recipient: [ADMIN | CEO | PMO | Client]
Deadline: [by when this must be addressed]
```

Example:
```
[Level 3 Escalation Required]
Condition: CPI = 0.61 (critical cost overrun)
Duration: 3 consecutive sprint measurements
Impact: EAC is €42k above BAC. Project will exhaust budget before completion.
Recommended action: Freeze all non-critical resource allocation. Request budget supplement or reduce scope by 25%.
Recommended recipient: CEO + ADMIN
Deadline: This week's management review
```

---

## Auto-Escalation via Alert Engine

The alert engine handles L1 and L2 automatically:
- L1: Alert stored in DB → visible in UI within 5 min
- L2: `sendAlertEmails()` sends digest for `level = critical` alerts

L3 and L4 require human judgment. Guardian recommends but does not auto-send executive emails.

---

## Deescalation

An alert is deescalated when:
- The triggering condition resolves (SPI returns to ≥ 0.85, blocker cleared)
- Guardian creates a `success` alert: "Project health restored — [metric] now [value]"
- Previous critical alert is marked read in the UI

Guardian does not automatically close escalations. The PM marks the alert as resolved.
