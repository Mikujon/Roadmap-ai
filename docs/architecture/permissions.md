# Permissions

**File:** `src/lib/permissions.ts`

Role-based access control for the application. Permissions are checked via `can.*` functions that take a `Role` enum value and return a boolean.

---

## Role Enum

```typescript
// Defined in Prisma schema, imported from @prisma/client
enum Role {
  ADMIN   // Full access — org owner
  PMO     // Project manager — can edit everything except delete
  CEO     // Read-heavy — financial visibility, settings access
  USER    // Standard collaborator
  DEV     // Developer — task-level access only
  STK     // Stakeholder — read-only view
}
```

---

## Permission Matrix

| Permission | ADMIN | PMO | CEO | USER | DEV | STK |
|-----------|:-----:|:---:|:---:|:----:|:---:|:---:|
| `createProject` | ✓ | ✓ | | | | |
| `editProject` | ✓ | ✓ | | | | |
| `deleteProject` | ✓ | | | | | |
| `editRisks` | ✓ | ✓ | | | | |
| `viewCosts` | ✓ | ✓ | ✓ | | | |
| `manageTeam` | ✓ | ✓ | | | | |

---

## Usage

```typescript
import { can } from "@/lib/permissions";
import { can } from "@/lib/permissions";

// In an API route:
if (!can.editProject(ctx.role!))
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });

// In a server component:
{can.createProject(role) && (
  <Link href="/projects/new">New project</Link>
)}
```

---

## How Roles Are Assigned

The role comes from the `OrgMember` record. `getAuthContext()` reads `member.role` and includes it in the returned context as `ctx.role`.

On first organisation creation (Clerk webhook `organization.created`), the creator is assigned `ADMIN`.

Users invited via the team settings UI are assigned the role selected during invitation.

---

## Org Settings Guard

The Organisation Settings page (`/settings/org`) enforces ADMIN-only access at the server component level:

```typescript
// src/app/(app)/settings/org/page.tsx
const ctx = await getAuthContext();
if (ctx.role !== "ADMIN") redirect("/settings");
```

This is a navigation-level check — the API routes also check `can.*` independently, so the permission is enforced at both the UI and API layers.

---

## Role-Aware UI

The sidebar and navigation adapt based on `preferredView` (the user's self-selected display mode, stored as `User.preferredView`):

| View | Visible Nav Items |
|------|------------------|
| PMO | Dashboard, Portfolio, Financials, Alerts, Team, Integrations, Billing, Roadmap, Settings |
| CEO | Dashboard, Portfolio, Financials, Alerts, Settings |
| STK | Dashboard, Archive, (no financials, no alerts) |
| DEV | Dashboard, My Tasks, Settings |

`preferredView` is distinct from `role` — a PMO-role user can switch their view to CEO to see the strategic dashboard without gaining CEO data access. API-level access is always governed by `role`, never by `preferredView`.
