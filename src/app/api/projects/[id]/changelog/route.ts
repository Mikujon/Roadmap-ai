import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

type ChangeType = "SCOPE" | "BUDGET" | "STATUS" | "RISK" | "TEAM" | "FEATURE" | "SPRINT" | "SETTINGS";

function actionToType(action: string): ChangeType {
  const a = action.toLowerCase();
  if (a.includes("scope"))               return "SCOPE";
  if (a.includes("budget") || a.includes("financial") || a.includes("cost")) return "BUDGET";
  if (a.includes("status"))              return "STATUS";
  if (a.includes("risk"))                return "RISK";
  if (a.includes("team") || a.includes("member") || a.includes("assign") || a.includes("resource")) return "TEAM";
  if (a.includes("feature") || a.includes("task") || a.includes("blocked")) return "FEATURE";
  if (a.includes("sprint"))              return "SPRINT";
  return "SETTINGS";
}

function initials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function fmtStatus(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get("type")?.toUpperCase() as ChangeType | undefined;

  // ── 1. Activity log ───────────────────────────────────────────────────────
  const activities = await db.activity.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // ── 2. Status logs ────────────────────────────────────────────────────────
  const statusLogs = await db.projectStatusLog.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // ── 3. Scope changes (from alerts of scope type) ──────────────────────────
  const alerts = await db.alert.findMany({
    where: { projectId: id, type: { in: ["scope_change", "budget_critical", "spi_critical"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // ── 4. Risk events (from activity) ───────────────────────────────────────
  const riskEvents = await db.activity.findMany({
    where: { projectId: id, entity: "risk" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // ── Merge & normalize ─────────────────────────────────────────────────────
  type Entry = {
    id: string;
    type: ChangeType;
    description: string;
    userName: string;
    userInitials: string;
    oldValue?: string;
    newValue?: string;
    createdAt: string;
  };

  const entries: Entry[] = [];

  // Project creation event
  entries.push({
    id:           `proj-created-${id}`,
    type:         "SETTINGS",
    description:  `Project "${project.name}" created`,
    userName:     "System",
    userInitials: "SY",
    createdAt:    project.createdAt.toISOString(),
  });

  // Activities
  for (const a of activities) {
    const type = actionToType(a.action);
    const meta = (a.meta ?? {}) as Record<string, any>;

    let description = a.entityName
      ? `${a.action.replace(/\./g, " ")} — ${a.entityName}`
      : a.action.replace(/\./g, " ");

    // Improve description for known action types
    if (a.action === "project.status_changed") {
      description = `Project status changed to ${fmtStatus(meta.newStatus ?? meta.status ?? "")}`;
    } else if (a.action === "feature.status_changed") {
      description = `Feature "${a.entityName}" status changed`;
    } else if (a.action === "feature.created") {
      description = `Feature "${a.entityName}" created`;
    } else if (a.action === "sprint.completed") {
      description = `Sprint "${a.entityName}" completed`;
    } else if (a.action === "sprint.started") {
      description = `Sprint "${a.entityName}" started`;
    } else if (a.action === "risk.mitigated") {
      description = `Risk "${a.entityName}" mitigated`;
    } else if (a.action === "risk.opened") {
      description = `Risk "${a.entityName}" opened`;
    } else if (a.action === "risk.closed") {
      description = `Risk "${a.entityName}" closed`;
    } else if (a.action === "budget.updated") {
      description = meta.reason ? `Budget updated — ${meta.reason}` : "Budget updated";
    }

    entries.push({
      id:           a.id,
      type,
      description,
      userName:     a.userName ?? "Unknown",
      userInitials: initials(a.userName),
      oldValue:     meta.oldValue ?? meta.from ?? undefined,
      newValue:     meta.newValue ?? meta.to   ?? undefined,
      createdAt:    a.createdAt.toISOString(),
    });
  }

  // Status logs
  for (const log of statusLogs) {
    entries.push({
      id:           log.id,
      type:         "STATUS",
      description:  log.note
        ? log.note
        : `Status changed to ${fmtStatus(log.status)}`,
      userName:     log.changedBy ?? "Unknown",
      userInitials: initials(log.changedBy),
      newValue:     fmtStatus(log.status),
      createdAt:    log.createdAt.toISOString(),
    });
  }

  // Alerts as budget/scope signals
  for (const alert of alerts) {
    const type: ChangeType = alert.type.includes("budget") ? "BUDGET"
      : alert.type.includes("scope") ? "SCOPE"
      : "SETTINGS";
    entries.push({
      id:           `alert-${alert.id}`,
      type,
      description:  alert.title + (alert.detail ? ` — ${alert.detail.slice(0, 120)}` : ""),
      userName:     "Guardian AI",
      userInitials: "AI",
      createdAt:    alert.createdAt.toISOString(),
    });
  }

  // De-duplicate by id, sort by date desc
  const seen = new Set<string>();
  const merged = entries
    .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
    .filter(e => !typeFilter || e.type === typeFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ entries: merged });
}
