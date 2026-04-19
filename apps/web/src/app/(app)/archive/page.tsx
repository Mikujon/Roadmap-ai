import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getProjectMetrics, fmtDate } from "@/lib/metrics";
import { unstable_cache } from "next/cache";
import ClosureReport from "./ClosureReport";

export default async function ArchivePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const getProjects = unstable_cache(
    () => db.project.findMany({
      where: {
        organisationId: ctx.org.id,
        status: { in: ["CLOSED", "ARCHIVED"] },
      },
      include: {
        sprints: { include: { features: true } },
        assignments: { include: { resource: true } },
        risks: true,
        requestedBy: { select: { name: true, email: true } },
        departments: { include: { department: true } },
        dependsOn: { include: { dependsOn: true } },
        statusLogs: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    [`archive-${ctx.org.id}`],
    { revalidate: 60 }
  );

  const projects = await getProjects();
  const rows = projects.map(p => getProjectMetrics(p as any));

  const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
    CLOSED:   { label: "Closed",   color: "#64748B", bg: "#F8FAFC", border: "#E2E8F0" },
    ARCHIVED: { label: "Archived", color: "#94A3B8", bg: "#F8FAFC", border: "#E2E8F0" },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .arch-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .arch-table th { background: #FAFBFC; border-bottom: 1px solid #E2E8F0; padding: 10px 16px; text-align: left; font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.07em; white-space: nowrap; }
        .arch-table td { padding: 14px 16px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; color: #0F172A; }
        .arch-row:hover td { background: #FAFBFC; }
        .arch-row:last-child td { border-bottom: none; }
        .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
      `}</style>

      <div style={{ padding: "28px 32px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.5px", marginBottom: 4 }}>Archive</h1>
            <p style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>
              {ctx.org.name} · {projects.length} archived projects
            </p>
          </div>
          <Link href="/portfolio" style={{ padding: "9px 16px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 12, fontWeight: 600, color: "#475569", textDecoration: "none" }}>
            ← Back to Portfolio
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Archived", value: rows.length, color: "#0F172A" },
            { label: "Closed",         value: projects.filter(p => p.status === "CLOSED").length,   color: "#64748B" },
            { label: "Archived",       value: projects.filter(p => p.status === "ARCHIVED").length, color: "#94A3B8" },
            { label: "Total Budget",   value: `$${Math.round(rows.reduce((s, r) => s + r.budgetTotal, 0)).toLocaleString()}`, color: "#2563EB" },
          ].map(k => (
            <div key={k.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>◫</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>No archived projects</h2>
            <p style={{ color: "#94A3B8", fontSize: 13 }}>Projects you close or archive will appear here</p>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
            <table className="arch-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Department</th>
                  <th>Progress</th>
                  <th>Start</th>
                  <th>End Planned</th>
                  <th>Budget</th>
                  <th>Actual Cost</th>
                  <th>Team</th>
                  <th>Closed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const p = projects.find(p => p.id === r.id)!;
                  const sm = STATUS_META[p.status] ?? STATUS_META.CLOSED;
                  return (
                    <tr key={r.id} className="arch-row">
                      <td style={{ minWidth: 180 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748B" }}>{r.name}</div>
                        <div style={{ fontSize: 10, color: "#CBD5E1", marginTop: 2 }}>{r.deptNames}</div>
                      </td>
                      <td>
                        <span className="badge" style={{ color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>{sm.label}</span>
                      </td>
                      <td style={{ fontSize: 12, color: "#94A3B8" }}>{r.deptNames}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 60, height: 4, background: "#F1F5F9", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: r.health.progressNominal + "%", background: "#CBD5E1", borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{r.health.progressNominal}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 11, color: "#94A3B8" }}>{fmtDate(r.startDate)}</td>
                      <td style={{ fontSize: 11, color: "#94A3B8" }}>{fmtDate(r.endDate)}</td>
                      <td style={{ fontSize: 12, color: "#94A3B8" }}>{r.budgetTotal > 0 ? `$${Math.round(r.budgetTotal).toLocaleString()}` : "—"}</td>
                      <td style={{ fontSize: 12, color: "#94A3B8" }}>{r.costActual > 0 ? `$${Math.round(r.costActual).toLocaleString()}` : "$0"}</td>
                      <td style={{ fontSize: 12, color: "#94A3B8" }}>{r.teamSize}</td>
                      <td style={{ fontSize: 11, color: "#CBD5E1" }}>{fmtDate(r.updatedAt)}</td>
                      <td style={{ display: "flex", gap: 8, alignItems: "center" }}>
  <ClosureReport projectName={p.name} statusLogs={(p as any).statusLogs ?? []} />
  <Link href={`/projects/${r.id}`} style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textDecoration: "none" }}>Open →</Link>
</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
