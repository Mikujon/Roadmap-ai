# Scenarios — Blocking

Blocking is the most acute form of project distress. A blocked feature is one where work cannot proceed due to an external dependency, missing decision, or unresolved technical issue.

---

## Feature Status Model

```
TODO → IN_PROGRESS → DONE
         │
         └─ BLOCKED   (can return to IN_PROGRESS once resolved)
```

Features can only be BLOCKED when they are active work. A TODO item is not blocked — it hasn't started. If a TODO item cannot start due to a dependency, the PM should either mark it IN_PROGRESS + BLOCKED or add a risk.

---

## Blocking Severity Levels

| Condition | Assessment | Action |
|-----------|------------|--------|
| 1 feature blocked | Low — monitor | Assign owner, set 2-day resolution target |
| 2 features blocked | Medium | PM standup agenda item today |
| 3+ features blocked | Critical — systemic | Emergency dependency review, escalate |
| Blocked in final sprint | Critical regardless of count | Renegotiate sprint scope immediately |
| Blocked > 5 business days | Escalate to ADMIN/CEO | Blocker is now a risk — log in risk register |

---

## Guardian AI Interpretation

When `blockedFeatures >= 1`, Guardian must:

1. **Identify pattern**: Are blocked features in the same sprint? Same module? Same assignee? This suggests a root cause.
2. **Estimate SPI impact**: Each blocked feature reduces `progressReal`. With N blocked features out of T total, SPI is effectively understated by `(N/T × 20%)`.
3. **Check for related risks**: Is there an open risk in the risk register that explains the blocking? If not, recommend creating one.
4. **Recommend resolution path**:
   - If external dependency → document it, escalate to project sponsor
   - If internal technical issue → assign dedicated debug time
   - If waiting on a decision → identify decision-maker and set deadline

---

## Blocking Scenarios

### Scenario A — Feature blocked waiting for external API
**Context**: Integration work stopped because third-party vendor has not delivered credentials.
**Guardian response**:
- Level: warning (1 feature) or critical (3+)
- Action: "Create a risk: External vendor dependency. Probability: High, Impact: High. Assign mitigation owner. Consider parallel work on unblocked features."
- SPI impact: visible in health score

### Scenario B — Multiple features blocked on same dependency
**Context**: Sprint 2 has 4 features all waiting on the same infrastructure setup.
**Guardian response**:
- Level: critical
- Root cause: Single point of failure in sprint dependency chain
- Action: "Emergency dependency review. Unblock the infrastructure task first — it is the critical path item. All others are sequentially dependent."
- Recommend restructuring sprint order

### Scenario C — Blocker crosses sprint boundary
**Context**: Feature was blocked in Sprint 1, carried over to Sprint 2, still blocked.
**Guardian response**:
- Escalate severity — this is no longer a sprint-level issue
- "Feature [name] has been blocked for [N] days across [M] sprints. This is now a project-level risk. Log it in the risk register and escalate to the project sponsor."
- Recommendation: Consider descoping this feature or replacing with a workaround

### Scenario D — Blocker right before deadline
**Context**: Sprint 3 (final sprint) has 2 blocked features. Deadline in 4 days.
**Guardian response**:
- Level: critical, immediate escalation
- "With [N] days remaining and [X]% of sprint blocked, delivery is at immediate risk. Options: (1) negotiate scope descoping, (2) extend deadline by [N] days, (3) deploy partial solution and handle blocked items in a hotfix."

---

## Blocker Resolution Checklist

When a blocker is resolved and feature returns to IN_PROGRESS:
1. ✓ Update feature status from BLOCKED → IN_PROGRESS
2. ✓ Add a note explaining resolution (use feature notes field)
3. ✓ If a risk was created for this blocker, update risk status to MITIGATED
4. ✓ Check if sprint velocity recovery is needed — can it be done before sprint end?
5. ✓ Inform team in next standup

---

## Ambient Intelligence — Blocker Detection

When an MCP message contains keywords suggesting a blocker:
- "waiting for", "blocked", "can't proceed", "missing", "dependency not ready", "no response from"
- → `applyIntelligence()` sets feature status to BLOCKED if confidence ≥ 0.6
- → Creates risk record: "Blocker: [extracted description]", probability=3, impact=4
- → Triggers Guardian re-analysis
- → Emits `feature.blocked` domain event

False positives: "blocked time" (calendar blocking), "I blocked 2 hours" — these are not feature blockers. Guardian must check context before applying intelligence.
