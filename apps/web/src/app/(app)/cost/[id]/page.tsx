import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
 
export default async function DepartmentDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
 
  const dept = await db.department.findFirst({
    where: { id: params.id, organisationId: ctx.org.id },
    include: {
      resources: {
        include: { assignments: { include: { project: true } } },
      },
    },
  });
 
  if (!dept) notFound();
 
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
 
  const costActual     = dept.resources.reduce((sum, r) =>
    sum + r.assignments.reduce((s, a) => s + a.actualHours * r.costPerHour, 0), 0);
  const costEstimated  = dept.resources.reduce((sum, r) =>
    sum + r.assignments.reduce((s, a) => s + a.estimatedHours * r.costPerHour, 0), 0);
  const hoursActual    = dept.resources.reduce((sum, r) =>
    sum + r.assignments.reduce((s, a) => s + a.actualHours, 0), 0);
  const hoursEstimated = dept.resources.reduce((sum, r) =>
    sum + r.assignments.reduce((s, a) => s + a.estimatedHours, 0), 0);
  const totalCapacity  = dept.resources.reduce((s, r) => s + r.capacityHours, 0);
  const utilization    = totalCapacity > 0 ? Math.min(100, Math.round((hoursActual / totalCapacity) * 100)) : 0;
  const variance       = costActual - costEstimated;
  const overBudget     = dept.budget > 0 && costActual > dept.budget;
 
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: dept.color }} />
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, color: "#E2EBF6" }}>{dept.name}</h1>
            <p style={{ fontSize: 13, color: "#64748B" }}>{dept.resources.length} resource{dept.resources.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Link href="/departments" style={{ fontSize: 13, color: "#64748B", textDecoration: "none" }}>← Back to Departments</Link>
      </div>
 
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 32 }}>
        {[
          { label: "Budget",       value: dept.budget > 0 ? fmt(dept.budget) : "—", color: overBudget ? "#EF4444" : "#E2EBF6", sub: overBudget ? "⚠ over budget" : "allocated" },
          { label: "Estimated",    value: fmt(costEstimated), color: "#3B82F6", sub: "from assignments" },
          { label: "Actual",       value: fmt(costActual),    color: "#00C97A", sub: "hours logged" },
          { label: "Variance",     value: fmt(Math.abs(variance)), color: variance > 0 ? "#EF4444" : "#00C97A", sub: variance > 0 ? "over estimate" : "under estimate" },
          { label: "Utilization",  value: utilization + "%",  color: utilization > 90 ? "#EF4444" : utilization > 70 ? "#F97316" : "#00C97A", sub: `${hoursActual}h / ${totalCapacity}h capacity` },
        ].map(k => (
          <div key={k.label} style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: "#64748B", marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color, fontFamily: "monospace", marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#475569" }}>{k.sub}</div>
          </div>
        ))}
      </div>
 
      {/* Resources table */}
      <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1A2E44", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#E2EBF6", letterSpacing: "0.05em" }}>RESOURCES</span>
        </div>
 
        {dept.resources.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
            <p style={{ color: "#64748B", fontSize: 13 }}>No resources assigned to this department yet</p>
            {ctx.role === "ADMIN" && (
              <Link href="/resources" style={{ display: "inline-block", marginTop: 16, fontSize: 12, color: "#007A73", fontWeight: 600, textDecoration: "none" }}>
                Manage Resources →
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 120px 100px 120px 120px 120px 100px", padding: "10px 20px", background: "#0A1220", borderBottom: "1px solid #1A2E44" }}>
              {["Resource", "Role", "Rate/h", "Est. Hours", "Act. Hours", "Cost", "Utilization"].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</div>
              ))}
            </div>
 
            {dept.resources.map((r, i) => {
              const rCostActual    = r.assignments.reduce((s, a) => s + a.actualHours * r.costPerHour, 0);
              const rHoursActual   = r.assignments.reduce((s, a) => s + a.actualHours, 0);
              const rHoursEstimated = r.assignments.reduce((s, a) => s + a.estimatedHours, 0);
              const rUtilization   = r.capacityHours > 0 ? Math.min(100, Math.round((rHoursActual / r.capacityHours) * 100)) : 0;
 
              return (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 120px 100px 120px 120px 120px 100px", padding: "14px 20px", borderBottom: i < dept.resources.length - 1 ? "1px solid #0F1827" : "none", alignItems: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#E2EBF6" }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{r.role}</div>
                  <div style={{ fontSize: 13, fontFamily: "monospace", color: "#E2EBF6" }}>{fmt(r.costPerHour)}</div>
                  <div style={{ fontSize: 13, fontFamily: "monospace", color: "#3B82F6" }}>{rHoursEstimated}h</div>
                  <div style={{ fontSize: 13, fontFamily: "monospace", color: "#00C97A" }}>{rHoursActual}h</div>
                  <div style={{ fontSize: 13, fontFamily: "monospace", color: "#E2EBF6" }}>{fmt(rCostActual)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 5, background: "#1E3A5F", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: rUtilization + "%", background: rUtilization > 90 ? "#EF4444" : rUtilization > 70 ? "#F97316" : "#00C97A", borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "#E2EBF6", minWidth: 30 }}>{rUtilization}%</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
 
      {/* Projects breakdown */}
      {dept.resources.some(r => r.assignments.length > 0) && (
        <div style={{ marginTop: 24, background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1A2E44" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#E2EBF6", letterSpacing: "0.05em" }}>PROJECTS BREAKDOWN</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 120px 120px 120px", padding: "10px 20px", background: "#0A1220", borderBottom: "1px solid #1A2E44" }}>
            {["Project", "Est. Hours", "Act. Hours", "Cost"].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</div>
            ))}
          </div>
          {(() => {
            const projectMap = new Map<string, { name: string; estH: number; actH: number; cost: number }>();
            dept.resources.forEach(r => {
              r.assignments.forEach(a => {
                const existing = projectMap.get(a.projectId) ?? { name: a.project.name, estH: 0, actH: 0, cost: 0 };
                projectMap.set(a.projectId, {
                  name: a.project.name,
                  estH: existing.estH + a.estimatedHours,
                  actH: existing.actH + a.actualHours,
                  cost: existing.cost + a.actualHours * r.costPerHour,
                });
              });
            });
            const projects = Array.from(projectMap.entries());
            return projects.map(([id, p], i) => (
              <div key={id} style={{ display: "grid", gridTemplateColumns: "2fr 120px 120px 120px", padding: "12px 20px", borderBottom: i < projects.length - 1 ? "1px solid #0F1827" : "none", alignItems: "center" }}>
                <Link href={`/projects/${id}`} style={{ fontSize: 13, fontWeight: 600, color: "#007A73", textDecoration: "none" }}>{p.name}</Link>
                <div style={{ fontSize: 13, fontFamily: "monospace", color: "#3B82F6" }}>{p.estH}h</div>
                <div style={{ fontSize: 13, fontFamily: "monospace", color: "#00C97A" }}>{p.actH}h</div>
                <div style={{ fontSize: 13, fontFamily: "monospace", color: "#E2EBF6" }}>{fmt(p.cost)}</div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}