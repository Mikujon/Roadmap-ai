export const dynamic = "force-dynamic";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import Link from "next/link";
import { getProjectMetrics } from "@/lib/metrics";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import ClosureReport from "./ClosureReport";

export default async function ArchivePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id, status: { in: ["CLOSED", "ARCHIVED"] } },
    include: {
      sprints: { include: { features: true } },
      risks: true,
      assignments: { include: { resource: true } },
      requestedBy: { select: { name: true, email: true } },
      departments: { include: { department: true } },
      statusLogs: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows = projects.map(p => {
    const m = getProjectMetrics(p as any);
    const isCompleted = p.status === "CLOSED";
    return {
      id:          p.id,
      name:        p.name,
      status:      p.status,
      healthScore: Math.round(m.health.healthScore),
      cpi:         m.health.cpi,
      closedAt:    p.updatedAt.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      isCompleted,
      statusLogs:  (p as any).statusLogs ?? [],
    };
  });

  return (
    <>
      <style>{`
        .arch-row { display:flex; align-items:center; gap:10px; padding:11px 14px; border-bottom:1px solid #E5E2D9; transition:background .1s; }
        .arch-row:last-child { border-bottom:none; }
        .arch-row:hover { background:#FAFAF8; }
        .tag { display:inline-flex; align-items:center; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:700; border:1px solid transparent; white-space:nowrap; }
        .btn-sm { padding:4px 10px; border:1px solid #E5E2D9; border-radius:6px; background:#fff; font-size:11px; font-weight:600; color:#5C5A52; cursor:pointer; font-family:inherit; transition:background .1s; text-decoration:none; display:inline-flex; align-items:center; }
        .btn-sm:hover { background:#F0EEE8; color:#18170F; }
      `}</style>

      <div style={{ padding: "24px 28px" }}>
        <Breadcrumb items={[{ label: "Archive" }]} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#18170F", letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Archive</h1>
            <p style={{ fontSize: 11, color: "#5C5A52", margin: 0 }}>
              Closed and archived projects · {rows.length} total
            </p>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "11px 14px", borderBottom: "1px solid #E5E2D9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Closed projects</span>
            <span style={{ fontSize: 11, color: "#9E9C93" }}>closure reports auto-generated</span>
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", fontSize: 13, color: "#9E9C93" }}>
              No archived projects yet
            </div>
          ) : rows.map(p => {
            const dot  = p.isCompleted && p.healthScore >= 60 ? "#16A34A" : p.isCompleted ? "#D97706" : "#9E9C93";
            const tag  = p.isCompleted && p.healthScore >= 60
              ? { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0", label: "Completed" }
              : p.isCompleted
                ? { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA", label: "Closed — cancelled" }
                : { bg: "#F8F7F3", color: "#9E9C93", border: "#E5E2D9", label: "Archived" };

            return (
              <div key={p.id} className="arch-row">
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#18170F" }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: "#9E9C93", marginTop: 1 }}>
                    {p.closedAt}
                    {p.healthScore > 0 && ` · Score ${p.healthScore}`}
                    {p.cpi > 0 && ` · Final CPI ${p.cpi.toFixed(2)}`}
                  </div>
                </div>
                <span className="tag" style={{ background: tag.bg, color: tag.color, borderColor: tag.border }}>
                  {tag.label}
                </span>
                <ClosureReport projectName={p.name} statusLogs={p.statusLogs} />
                <Link href={`/projects/${p.id}`} className="btn-sm" style={{ marginLeft: 8 }}>
                  View
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
