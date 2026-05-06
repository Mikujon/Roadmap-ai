# RoadmapAI — Codebase Rules

## CORE PRODUCT RULE — Guardian AI Context

Every request to `/api/v1/ai/chat` MUST inject full project context into the system prompt
when a `projectId` is present in the request body.

### Required functions in `src/app/api/v1/ai/chat/route.ts`

**`buildProjectContext(projectId, orgId)`**
- Fetches from DB: project name, status, healthScore, budgetTotal
- Fetches active/upcoming sprint + all its features
- Fetches open risks (id, title, probability, impact)
- Fetches team assignments with resource name and role
- Returns `null` if projectId is absent or project not found for the org

**`buildSystemPrompt(ctx, project)`**
- Always injects: org name, user name/email, user role
- When project is non-null, MUST inject:
  - Project name, ID, status, health score, budget
  - Active sprint name + task counts (total / done / in-progress / blocked)
  - Open risks list (up to 5, with score = probability × impact)
  - Team member names and roles
- When project is null: generic "use get_projects to discover projects" instruction

### Required: `orchestrate()` after every write tool

After every tool that mutates the database, call `orchestrate()` (fire-and-forget):

| Tool | orchestrate event | projectId source |
|------|-------------------|-----------------|
| `create_risk` | `"feature_updated"` | `toolInput.projectId` |
| `create_feature` | `"feature_updated"` | lookup via sprint |
| `update_feature_status` | `"feature_updated"` | lookup via feature→sprint |
| `update_project_status` | `"feature_updated"` | `toolInput.projectId` |

### Required: Frontend always passes `projectId`

`AIChatPanel` MUST pass `projectId` in every fetch body to `/api/v1/ai/chat`.
`projectId` prop is optional at component level (portfolio view has no project),
but when present it MUST be included in the request body.

### Enforcement

These rules are verified at every relevant session. If any check fails, fix immediately
before proceeding with other work.
