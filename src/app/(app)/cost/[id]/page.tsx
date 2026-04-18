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

  const costActual    = dept.resources.reduce((sum, r) =>
    sum + r.assignments.reduce((s, a) => s + a.actualHours * r.costPerHour, 0), 0);
  const costEstimated = dept.resources.reduce((sum, r) =>
    sum + r.assignments.reduce((s, a) => s + a.estimatedHours * r.costPerHour, 0), 0);
  const hoursActual   = dept.resources.reduce((sum, r) =>
    sum + r.assignments.reduce((s, a) => s + a.actualHours, 0), 0);
  const totalCapacity = dept.resources.reduce((s, r) => s + r.capacityHours, 0);
  const utilization   = totalCapacity > 0 ? Math.min(100, Math.round((hoursActual / totalCapacity) * 100)) : 0;
  const variance      = costActual - costEstimated;
  const overBudget    = dept.budget > 0 && costActual > dept.budget;

  const kpis = [
    { label: "Budget",      value: dept.budget > 0 ? fmt(dept.budget) : "—",  color: overBudget ? "#DC2626" : "#18170F", sub: overBudget ? "over budget" : "allocated" },
    { label: "Estimated",   value: fmt(costEstimated), color: "#2563EB",  sub: "from assignments" },
    { label: "Actual",      value: fmt(costActual),    color: "#059669",  sub: "hours logged" },
    { label: "Variance",    value: fmt(Math.abs(variance)), color: variance > 0 ? "#DC2626" : "#059669", sub: variance > 0 ? "over estimate" : "under estimate" },
    { label: "Utilization", value: utilization + "%",  color: utilization > 90 ? "#DC2626" : utilization > 70 ? "#D97706" : "#059669", sub: `${hoursActual}h / ${totalCapacity}h capacity` },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: dept.color, flexShrink: 0 }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#18170F", marginBottom: 2 }}>{dept.name}</h1>
            <p style={{ fontSize: 12, color: "#5C5A52" }}>{dept.resources.length} resource{dept.resources.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Link href="/cost" style={{ fontSize: 12, color: "#5C5A52", textDecoration: "none" }}>← Back to Financials</Link>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontVariantNumeric: "tabular-nums", marginBottom: 3 }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#9E9C93" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Resources table */}
      <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #F4F2EC", background: "#F8FAFC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.08em" }}>Resources</span>
        </div>

        {dept.resources.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>👤</div>
            <p style={{ color: "#9E9C93", fontSize: 13 }}>No resources assigned to this department yet</p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 120px 100px 120px 120px 120px 100px", padding: "8px 20px", background: "#F8FAFC", borderBottom: "1px solid #F4F2EC" }}>
              {["Resource", "Role", "Rate/h", "Est. Hours", "Act. Hours", "Cost", "Utilization"].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
              ))}
            </div>

            {dept.resources.map((r, i) => {
              const rCostActual     = r.assignments.reduce((s, a) => s + a.actualHours * r.costPerHour, 0);
              const rHoursActual    = r.assignments.reduce((s, a) => s + a.actualHours, 0);
              const rHoursEstimated = r.assignments.reduce((s, a) => s + a.estimatedHours, 0);
              const rUtil           = r.capacityHours > 0 ? Math.min(100, Math.round((rHoursActual / r.capacityHours) * 100)) : 0;
              const utilColor       = rUtil > 90 ? "#DC2626" : rUtil > 70 ? "#D97706" : "#059669";

              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid", gridTemplateColumns: "2fr 120px 100px 120px 120px 120px 100px",
                    padding: "12px 20px", alignItems: "center",
                    borderBottom: i < dept.resources.length - 1 ? "1px solid #F4F2EC" : "none",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F" }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "#5C5A52" }}>{r.role}</div>
                  <div style={{ fontSize: 12, color: "#5C5A52", fontVariantNumeric: "tabular-nums" }}>{fmt(r.costPerHour)}</div>
                  <div style={{ fontSize: 12, color: "#2563EB", fontVariantNumeric: "tabular-nums" }}>{rHoursEstimated}h</div>
                  <div style={{ fontSize: 12, color: "#059669", fontVariantNumeric: "tabular-nums" }}>{rHoursActual}h</div>
                  <div style={{ fontSize: 12, color: "#18170F", fontVariantNumeric: "tabular-nums" }}>{fmt(rCostActual)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 4, background: "#F4F2EC", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: rUtil + "%", background: utilColor, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, color: "#5C5A52", minWidth: 30 }}>{rUtil}%</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Projects breakdown */}
      {dept.resources.some(r => r.assignments.length > 0) && (
        <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #F4F2EC", background: "#F8FAFC" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.08em" }}>Projects Breakdown</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 120px 120px 120px", padding: "8px 20px", background: "#F8FAFC", borderBottom: "1px solid #F4F2EC" }}>
            {["Project", "Est. Hours", "Act. Hours", "Cost"].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
            ))}
          </div>

          {(() => {
            const projectMap = new Map<string, { name: string; estH: number; actH: number; cost: number }>();
            dept.resources.forEach(r => {
              r.assignments.forEach(a => {
                const ex = projectMap.get(a.projectId) ?? { name: a.project.name, estH: 0, actH: 0, cost: 0 };
                projectMap.set(a.projectId, {
                  name: a.project.name,
                  estH: ex.estH + a.estimatedHours,
                  actH: ex.actH + a.actualHours,
                  cost: ex.cost + a.actualHours * r.costPerHour,
                });
              });
            });
            const projects = Array.from(projectMap.entries());
            return projects.map(([id, p], i) => (
              <div key={id} style={{ display: "grid", gridTemplateColumns: "2fr 120px 120px 120px", padding: "11px 20px", borderBottom: i < projects.length - 1 ? "1px solid #F4F2EC" : "none", alignItems: "center" }}>
                <Link href={`/projects/${id}`} style={{ fontSize: 13, fontWeight: 600, color: "#006D6B", textDecoration: "none" }}>{p.name}</Link>
                <div style={{ fontSize: 12, color: "#2563EB", fontVariantNumeric: "tabular-nums" }}>{p.estH}h</div>
                <div style={{ fontSize: 12, color: "#059669", fontVariantNumeric: "tabular-nums" }}>{p.actH}h</div>
                <div style={{ fontSize: 12, color: "#18170F", fontVariantNumeric: "tabular-nums" }}>{fmt(p.cost)}</div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
