# Methodology Advisor

Guardian AI provides methodology guidance when PMs ask about how to run their projects. This file defines the recommended frameworks, when to use each, and how RoadmapAI supports them.

---

## Supported Methodologies

| Methodology | Best for | Guardian support level |
|-------------|----------|----------------------|
| **Agile/Scrum** | Software, product, iterative | Full — sprints, board, velocity tracking |
| **Waterfall/PMBOK** | Construction, compliance, fixed scope | Full — phases, EVM, milestone tracking |
| **Hybrid** | Client-facing software, regulated industries | Full — both sprint and phase views |
| **Kanban** | Support, maintenance, continuous flow | Partial — board view, no sprint velocity |
| **SAFe** | Large organisations, multiple teams | Partial — program increment maps to phases |

---

## Agile/Scrum Guidance

### Sprint Structure
- Recommended sprint length: **2 weeks** (platform default: 14-day sprints)
- Recommended sprint capacity: 4–8 features per sprint per developer
- Sprint velocity = features completed per sprint period
- Sprint health: `sprintDone / sprintTotal × 100`

### Scrum Events in RoadmapAI
| Event | Platform equivalent |
|-------|-------------------|
| Sprint Planning | Sprint backlog — add features, assign, estimate |
| Daily Standup | Guardian chat — "what's blocked today?" |
| Sprint Review | Sprint status → DONE, progress logged |
| Retrospective | Project notes, closure report lessons learned |
| Backlog Refinement | Backlog tab — reorder, re-estimate, reprioritise |

### Agile Health Signals
- **Velocity stable or increasing**: healthy agile cadence
- **Velocity declining sprint-over-sprint**: team overload, technical debt, or scope creep
- **Blocked features per sprint > 2**: dependency management problem
- **Sprint carryover rate > 30%**: sprint planning is unrealistic — reduce sprint scope

### Guardian Agile Advice
- "Sprint 3 has 12 features for 3 developers. Industry benchmark is 4–6 features per developer per sprint. Consider reducing to 9–10."
- "Sprint velocity has declined from 8 to 4 features/sprint over 3 sprints. This is a team capacity or motivation signal."

---

## Waterfall/PMBOK Guidance

### Phase Structure
- Planning → Development → QA & Launch (default 3-phase structure)
- Each phase has milestones (sprints) and deliverables (features)
- Phase completion gate: all sprints in phase must be DONE

### EVM in Waterfall Context
Waterfall projects benefit most from EVM because:
- Scope is fixed upfront (BAC is reliable)
- SPI and CPI have clear baselines
- Variance at Completion (VAC) is the critical executive metric

### Gate Review Checklist (Guardian assists)
Before moving phase to DONE:
- ✓ All features in phase sprints DONE (not BLOCKED or IN_PROGRESS)
- ✓ Phase documents APPROVED
- ✓ FA reviewed and approved (if applicable)
- ✓ Risks from this phase closed or mitigated
- ✓ Budget for phase within variance

---

## Hybrid Methodology

Use hybrid when:
- Client deliverables have fixed dates (waterfall phases)
- Internal development is iterative (agile sprints within phases)

### Configuration in RoadmapAI
- 3 phases: Business Design → Technical Development → UAT & Delivery
- 2 agile sprints per phase
- Phase gates at project level; sprint velocity at team level
- EVM applied at phase level; velocity tracked at sprint level

### Hybrid Health Signals
- Phase-level SPI: schedule adherence for client commitments
- Sprint velocity: internal team efficiency
- If these diverge: team is efficient but scope is growing (scope creep alert)

---

## Risk-Based Project Classification

| Project Type | Risk Profile | Methodology Recommendation |
|-------------|-------------|---------------------------|
| Software product (greenfield) | Medium tech, high scope | Agile/Scrum |
| Integration project | High tech, medium scope | Hybrid |
| Infrastructure migration | Low tech, high schedule | Waterfall |
| Compliance/regulatory | Low tech, high governance | Waterfall + governance gate |
| Client-facing application | High all dimensions | Hybrid with FA |
| R&D / Innovation | High uncertainty | Agile with risk buffer |

---

## PM Best Practices (Guardian Recommendations)

### Sprint Planning
1. Include only committed work — velocity × 0.8 = safe sprint capacity
2. At least one buffer feature per sprint (nice-to-have that can be deferred)
3. No feature should span more than 1 sprint — split if necessary

### Risk Management
1. Log risks early — risk not logged is risk not managed
2. Review risk register every sprint
3. Assign every risk an owner and a mitigation deadline
4. Close risks promptly when resolved — stale open risks inflate healthScore penalty

### Stakeholder Communication
1. Weekly status update for STAKEHOLDER role (automated via Guardian)
2. Executive dashboard (CEO role) always up to date via real-time health score
3. Escalation within 24h of critical alert — never let critical alerts age

### Scope Control
1. Any scope addition requires FA revision
2. Scope additions in Sprint 4+ require explicit sponsor approval
3. Scope reduction is a valid risk mitigation — Guardian recommends it when SPI < 0.7

---

## Vocabulary Mapping

| RoadmapAI Term | PMBOK Equivalent | Agile Equivalent |
|----------------|-----------------|-----------------|
| Project | Project | Product / Release |
| Phase | Phase | Program Increment (SAFe) |
| Sprint | Sub-phase / Milestone | Sprint / Iteration |
| Feature | Deliverable / Work Package | User Story / Task |
| Health Score | Overall Project Health | Team Health Metric |
| Guardian Report | Status Report | Sprint Review Output |
| Functional Analysis | Requirements Document / Scope Baseline | Product Backlog (formal) |
| Risk | Risk | Risk / Impediment |
