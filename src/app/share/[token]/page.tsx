import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  DONE:        { color: "#059669", bg: "#F0FDF4" },
  IN_PROGRESS: { color: "#2563EB", bg: "#EFF6FF" },
  BLOCKED:     { color: "#DC2626", bg: "#FEF2F2" },
  TODO:        { color: "#5C5A52", bg: "#F4F2EC" },
};

export default async function SharePage({ params }: { params: { token: string } }) {
  const project = await db.project.findFirst({
    where: { shareToken: params.token, shareEnabled: true },
    include: {
      phases: { orderBy: { order: "asc" } },
      sprints: {
        orderBy: { order: "asc" },
        include: { features: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!project) return notFound();

  return (
    <div style={{ minHeight: "100vh", background: "#F8F7F3", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Topbar */}
      <header style={{ height: 52, background: "#fff", borderBottom: "1px solid #E5E2D9", display: "flex", alignItems: "center", padding: "0 24px", gap: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: "#006D6B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13 }}>
          R
        </div>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#18170F" }}>Roadmap<span style={{ color: "#006D6B" }}>AI</span></span>
        <span style={{ fontSize: 11, color: "#9E9C93", marginLeft: 4 }}>· Shared view</span>
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
        {/* Project header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#18170F", marginBottom: 4 }}>{project.name}</h1>
          {project.description && (
            <p style={{ fontSize: 13, color: "#5C5A52", marginBottom: 8 }}>{project.description}</p>
          )}
          <p style={{ fontSize: 12, color: "#9E9C93" }}>
            {project.startDate?.toLocaleDateString()} → {project.endDate?.toLocaleDateString()}
          </p>
        </div>

        {/* Sprints */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {project.sprints.map(sprint => (
            <div key={sprint.id} style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 18px", borderBottom: sprint.features.length ? "1px solid #F4F2EC" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#18170F" }}>
                    Sprint {sprint.num} — {sprint.name}
                  </span>
                  {sprint.goal && (
                    <p style={{ fontSize: 11, color: "#5C5A52", marginTop: 2 }}>{sprint.goal}</p>
                  )}
                </div>
                <span style={{ fontSize: 11, color: "#9E9C93" }}>{sprint.features.length} features</span>
              </div>

              {sprint.features.map((f, i) => {
                const s = STATUS_COLOR[f.status] ?? STATUS_COLOR.TODO;
                return (
                  <div
                    key={f.id}
                    style={{
                      padding: "9px 18px", display: "flex", alignItems: "center", gap: 10,
                      borderBottom: i < sprint.features.length - 1 ? "1px solid #F8F7F3" : "none",
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, color: s.color, background: s.bg, flexShrink: 0 }}>
                      {f.status.replace("_", " ")}
                    </span>
                    <span style={{ fontSize: 12, color: "#5C5A52" }}>{f.title}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <p style={{ marginTop: 32, textAlign: "center", fontSize: 11, color: "#CBD5E1" }}>
          Shared via RoadmapAI · Read-only view
        </p>
      </div>
    </div>
  );
}
