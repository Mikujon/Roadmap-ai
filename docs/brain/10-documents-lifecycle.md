# Documents Lifecycle

Documents in RoadmapAI follow a formal approval workflow. This file defines states, transitions, permissions, and AI interactions for project documents and functional analysis.

---

## Document Types

| Type | Model | Purpose |
|------|-------|---------|
| Project Document | `ProjectDocument` | Requirements, design specs, meeting notes, plans |
| Functional Analysis | `FunctionalAnalysis` | Scope definition, acceptance criteria, FA versioned history |

---

## ProjectDocument Lifecycle

```
DRAFT → UNDER_REVIEW → APPROVED
  │           │
  │           └─ REVISION_REQUESTED → back to PM → DRAFT (re-submit)
  │
  └─ (deleted before review) → no trace
```

### States

| State | Meaning | Who can move forward |
|-------|---------|----------------------|
| `DRAFT` | Being authored | PMO, ADMIN |
| `UNDER_REVIEW` | Submitted for approval | System (on submit) |
| `APPROVED` | Accepted — locked | CEO, PMO, ADMIN |

### API

| Endpoint | Action |
|----------|--------|
| `GET /api/projects/[id]/documents` | List all documents for project |
| `POST /api/projects/[id]/documents` | Create new document |
| `PATCH /api/projects/[id]/documents/[docId]` | Update title, status, fileUrl |
| `DELETE /api/projects/[id]/documents/[docId]` | Delete (PMO/ADMIN only) |

Permission: `can.editDocuments(role)` = ADMIN, PMO  
Permission: `can.approveDocuments(role)` = ADMIN, CEO, PMO

---

## Functional Analysis Lifecycle

```
DRAFT
  │
  └─ PM submits → PENDING_APPROVAL
                       │
                       ├─ CEO/PMO/ADMIN approves → APPROVED (locked)
                       │
                       ├─ Request revision → REVISION_REQUESTED
                       │    └─ PM revises → saves new version → PENDING_APPROVAL
                       │
                       └─ Rejected → REJECTED
                                      └─ PM must recreate (or re-generate with AI)
```

### States

| State | Meaning |
|-------|---------|
| `DRAFT` | Work in progress |
| `PENDING_APPROVAL` | Awaiting review |
| `APPROVED` | Accepted — immutable (only via new version) |
| `REVISION_REQUESTED` | Returned to author with feedback |
| `REJECTED` | Declined — must be recreated |

### Versioning

Every time an FA is edited after approval, a new `FAVersion` is created:
```prisma
model FAVersion {
  id         String
  analysisId String
  version    Int           // increments on each save
  content    Json          // snapshot of FA content at this version
  changedBy  String        // user name
  changeNote String?       // reason for revision
  createdAt  DateTime
}
```

The current FA always has the highest version. Past versions are audit history.

### API

| Endpoint | Action | Permission |
|----------|--------|------------|
| `GET /api/projects/[id]/functional-analysis` | Get FA + versions | any authenticated |
| `POST /api/projects/[id]/functional-analysis/generate` | AI generates FA | PMO, ADMIN |
| `POST /api/projects/[id]/functional-analysis/approve` | Approve | ADMIN, CEO, PMO |
| `POST /api/projects/[id]/functional-analysis/reject` | Reject with reason | ADMIN, CEO, PMO |
| `POST /api/projects/[id]/functional-analysis/request-revision` | Request revision | ADMIN, CEO, PMO |

---

## Document Governance Rules

1. **Development should not begin before FA is APPROVED** (governance check in Guardian)
2. **Sprint 3+ with DRAFT FA** = governance alert (warning → critical after Sprint 4)
3. **Rejected FA with no new submission after 7 days** = governance critical alert
4. **APPROVED documents cannot be directly edited** — a new version must be created
5. **All FA state transitions are logged** in `FAVersion.changeNote`

---

## AI Interaction with Documents

### FA Generation

Guardian AI can generate a Functional Analysis from:
- Project name and brief (`briefText`)
- Existing features in backlog
- Ambient messages received for the project
- Risk register entries

The generated FA follows the template in `07-report-templates.md`.

### Document Analysis

When asked "is this project well documented?", Guardian checks:
- Count of `APPROVED` documents
- FA status (APPROVED = good, DRAFT/PENDING in late stage = warning)
- Last document update date (stale if > 30 days without update on active project)
- Missing document types for project stage (planning phase needs requirements doc)

### Revision Assistance

When a document is in `REVISION_REQUESTED` state, Guardian can:
- Summarise the revision request note
- Suggest specific sections to improve
- Offer to regenerate the FA incorporating the requested changes

---

## Document Permissions Summary

| Action | ADMIN | PMO | CEO | STAKEHOLDER | DEV |
|--------|-------|-----|-----|-------------|-----|
| View documents | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create document | ✓ | ✓ | — | — | — |
| Edit document | ✓ | ✓ | — | — | — |
| Delete document | ✓ | ✓ | — | — | — |
| Approve/Reject | ✓ | ✓ | ✓ | — | — |
| Generate FA (AI) | ✓ | ✓ | — | — | — |
