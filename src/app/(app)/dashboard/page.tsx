import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id },
    include: {
      sprints: { include: { features: true } },
      phases: { orderBy: { order: "asc" } },
      _count: { select: { sprints: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const projectStats = projects.map(p => {
    const allF = p.sprints.flatMap(s => s.features);
    const done = allF.filter(f => f.status === "DONE").length;
    const blocked = allF.filter(f => f.status === "BLOCKED").length;
    const inProgress = allF.filter(f => f.status === "IN_PROGRESS").length;
    const pct = allF.length ? Math.round((done / allF.length) * 100) : 0;
    const activeSprints = p.sprints.filter(s => s.status === "ACTIVE").length;
    const atRisk = blocked >= 2 || (blocked > 0 && activeSprints > 0);
    const health = pct === 100 ? "COMPLETED" : atRisk ? "AT_RISK" : activeSprints > 0 ? "ON_TRACK" : "NOT_STARTED";

    // Current phase — based on active sprints or progress
    const totalSprints = p.sprints.length;
    const doneSprints = p.sprints.filter(s => s.status === "DONE").length;
    const phaseCount = p.phases.length;
    let currentPhaseIdx = 0;
    if (totalSprints > 0 && phaseCount > 0) {
      currentPhaseIdx = Math.min(
        Math.floor((doneSprints / totalSprints) * phaseCount),
        phaseCount - 1
      );
    }
    const currentPhase = p.phases[currentPhaseIdx] ?? null;

    return { ...p, allF, done, blocked, inProgress, pct, activeSprints, atRisk, health, currentPhase };
  });

  const totalProjects = projects.length;
  const onTrack = projectStats.filter(p => p.health === "ON_TRACK").length;
  const atRisk = projectStats.filter(p => p.health === "AT_RISK").length;
  const completed = projectStats.filter(p => p.health === "COMPLETED").length;
  const totalFeatures = projectStats.reduce((a, p) => a + p.allF.length, 0);
  const totalDone = projectStats.reduce((a, p) => a + p.done, 0);
  const totalBlocked = projectStats.reduce((a, p) => a + p.blocked, 0);
  const avgCompletion = totalProjects ? Math.round(projectStats.reduce((a, p) => a + p.pct, 0) / totalProjects) : 0;

  const HEALTH: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    ON_TRACK:    { label: "On Track",    color: "#00C97A", bg: "rgba(0,201,122,0.1)",   dot: "#00C97A" },
    AT_RISK:     { label: "At Risk",     color: "#F97316", bg: "rgba(249,115,22,0.1)",  dot: "#F97316" },
    COMPLETED:   { label: "Completed",   color: "#3B82F6", bg: "rgba(59,130,246,0.1)",  dot: "#3B82F6" },
    NOT_STARTED: { label: "Not Started", color: "#64748B", bg: "rgba(100,116,139,0.1)", dot: "#64748B" },
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, color: "#E2EBF6" }}>PMO Dashboard</h1>
          <p style={{ fontSize: 13, color: "#64748B" }}>{ctx.org.name} · {ctx.role} · {totalProjects} project{totalProjects !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/projects/new" style={{ padding: "10px 22px", background: "linear-gradient(135deg,#007A73,#0a9a90)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          ✦ New Project
        </Link>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12, marginBottom: 32 }}>
        {[
          { label: "Total Projects",  value: totalProjects,       color: "#E2EBF6", sub: "in portfolio" },
          { label: "On Track",        value: onTrack,             color: "#00C97A", sub: "projects" },
          { label: "At Risk",         value: atRisk,              color: "#F97316", sub: "need attention" },
          { label: "Completed",       value: completed,           color: "#3B82F6", sub: "projects" },
          { label: "Avg Completion",  value: avgCompletion + "%", color: "#E2EBF6", sub: "across portfolio" },
          { label: "Total Features",  value: totalFeatures,       color: "#E2EBF6", sub: `${totalDone} done` },
          { label: "Blocked",         value: totalBlocked,        color: totalBlocked > 0 ? "#EF4444" : "#00C97A", sub: "features" },
        ].map(k => (
          <div key={k.label} style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: "#64748B", marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color, fontFamily: "monospace", marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#475569" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Portfolio Health Bar */}
      {totalProjects > 0 && (
        <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "18px 22px", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#E2EBF6", letterSpacing: "0.05em" }}>PORTFOLIO HEALTH</span>
            <span style={{ fontSize: 11, color: "#64748B" }}>{avgCompletion}% avg completion</span>
          </div>
          <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 2 }}>
            {completed > 0 && <div style={{ flex: completed,   background: "#3B82F6", borderRadius: 2 }} />}
            {onTrack > 0  && <div style={{ flex: onTrack,     background: "#00C97A", borderRadius: 2 }} />}
            {atRisk > 0   && <div style={{ flex: atRisk,      background: "#F97316", borderRadius: 2 }} />}
            {(totalProjects - completed - onTrack - atRisk) > 0 && <div style={{ flex: totalProjects - completed - onTrack - atRisk, background: "#1E3A5F", borderRadius: 2 }} />}
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
            {[
              { label: "Completed",   value: completed,                                  color: "#3B82F6" },
              { label: "On Track",    value: onTrack,                                    color: "#00C97A" },
              { label: "At Risk",     value: atRisk,                                     color: "#F97316" },
              { label: "Not Started", value: totalProjects - completed - onTrack - atRisk, color: "#475569" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                <span style={{ fontSize: 11, color: "#64748B" }}>{l.label}: <strong style={{ color: "#E2EBF6" }}>{l.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects Table */}
      {totalProjects === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#E2EBF6" }}>No projects yet</h2>
          <p style={{ color: "#64748B", marginBottom: 24 }}>Create your first AI-powered project roadmap</p>
          <Link href="/projects/new" style={{ padding: "12px 28px", background: "linear-gradient(135deg,#007A73,#0a9a90)", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
            Create First Project
          </Link>
        </div>
      ) : (
        <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 130px 160px 100px 80px 80px 80px 140px 100px", gap: 0, padding: "10px 20px", background: "#0A1220", borderBottom: "1px solid #1A2E44" }}>
            {["Project", "Health", "Current Phase", "Progress", "Sprints", "Features", "Blocked", "Timeline", ""].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</div>
            ))}
          </div>

          {/* Table rows */}
          {projectStats.map((p, i) => {
            const h = HEALTH[p.health];
            return (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2fr 130px 160px 100px 80px 80px 80px 140px 100px", gap: 0, padding: "14px 20px", borderBottom: i < projectStats.length - 1 ? "1px solid #0F1827" : "none", alignItems: "center" }}>
                {/* Project name */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#E2EBF6", marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{p.description?.slice(0, 60) ?? ""}</div>
                </div>

                {/* Health */}
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: h.color, background: h.bg, padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: h.dot, display: "inline-block" }} />
                    {h.label}
                  </span>
                </div>

                {/* Current Phase */}
                <div>
                  {p.currentPhase ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.currentPhase.accent, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: p.currentPhase.accent }}>Phase {p.currentPhase.num}</div>
                        <div style={{ fontSize: 10, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{p.currentPhase.sub || p.currentPhase.label}</div>
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: "#475569" }}>—</span>
                  )}
                </div>

                {/* Progress */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 5, background: "#1E3A5F", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: p.pct + "%", background: p.pct === 100 ? "#3B82F6" : p.atRisk ? "#F97316" : "#00C97A", borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "#E2EBF6", minWidth: 30 }}>{p.pct}%</span>
                  </div>
                </div>

                {/* Sprints */}
                <div style={{ fontSize: 13, fontFamily: "monospace", color: "#E2EBF6" }}>
                  {p.activeSprints > 0 && <span style={{ color: "#3B82F6" }}>{p.activeSprints} </span>}
                  <span style={{ color: "#475569" }}>/ {p._count.sprints}</span>
                </div>

                {/* Features */}
                <div style={{ fontSize: 13, fontFamily: "monospace", color: "#E2EBF6" }}>
                  {p.done}<span style={{ color: "#475569" }}>/{p.allF.length}</span>
                </div>

                {/* Blocked */}
                <div style={{ fontSize: 13, fontFamily: "monospace", color: p.blocked > 0 ? "#EF4444" : "#475569" }}>
                  {p.blocked > 0 ? `⚠ ${p.blocked}` : "—"}
                </div>

                {/* Timeline */}
                <div style={{ fontSize: 10, color: "#475569" }}>
                  {new Date(p.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} →{" "}
                  {new Date(p.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                </div>

                {/* Action */}
                <div>
                  <Link href={`/projects/${p.id}`} style={{ fontSize: 11, color: "#007A73", background: "rgba(0,122,115,0.1)", border: "1px solid rgba(0,122,115,0.3)", padding: "5px 12px", borderRadius: 6, textDecoration: "none", fontWeight: 600 }}>
                    Open →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}