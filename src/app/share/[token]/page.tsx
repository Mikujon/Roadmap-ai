import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function SharePage({
  params,
}: {
  params: { token: string };
}) {
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
    <div style={{ padding: 32, background: "#080E1A", minHeight: "100vh", color: "#E2EBF6", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{project.name}</h1>
      <p style={{ color: "#64748B", marginBottom: 32 }}>
        {project.startDate?.toLocaleDateString()} → {project.endDate?.toLocaleDateString()}
      </p>
      {project.sprints.map(sprint => (
        <div key={sprint.id} style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{sprint.num} — {sprint.name}</div>
          <p style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>{sprint.goal}</p>
          {sprint.features.map(f => (
            <div key={f.id} style={{ fontSize: 12, color: "#94A3B8", padding: "4px 0", borderBottom: "1px solid #1A2E44" }}>
              {f.title}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}