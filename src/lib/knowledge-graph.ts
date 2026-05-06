import { db } from "@/lib/prisma";

export interface KnowledgeNode {
  type: string;
  id: string;
  title: string;
  snippet: string;
  score: number;
}

// Text-search fallback — used until vector embeddings are configured.
// Searches risks, activities, and features for keyword matches.
export async function semanticSearch(
  orgId: string,
  query: string,
  type?: string,
  limit = 5,
  _threshold = 0.6,
): Promise<KnowledgeNode[]> {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(k => k.length > 2)
    .slice(0, 5);

  if (!keywords.length) return [];

  const results: KnowledgeNode[] = [];

  // Search risks
  if (!type || type === "risk") {
    const risks = await db.risk.findMany({
      where: {
        project: { organisationId: orgId },
        OR: keywords.map(k => ({
          OR: [
            { title:       { contains: k, mode: "insensitive" as const } },
            { description: { contains: k, mode: "insensitive" as const } },
            { mitigation:  { contains: k, mode: "insensitive" as const } },
          ],
        })),
      },
      include: { project: { select: { name: true } } },
      take: limit,
    });
    results.push(...risks.map(r => ({
      type:    "risk",
      id:      r.id,
      title:   r.title,
      snippet: r.description ?? r.mitigation ?? `Score: ${r.probability * r.impact}`,
      score:   0.75,
    })));
  }

  // Search features
  if (!type || type === "feature") {
    const features = await db.feature.findMany({
      where: {
        sprint: { project: { organisationId: orgId } },
        OR: keywords.map(k => ({
          title: { contains: k, mode: "insensitive" as const },
        })),
      },
      include: { sprint: { select: { name: true, project: { select: { name: true } } } } },
      take: limit,
    });
    results.push(...features.map(f => ({
      type:    "feature",
      id:      f.id,
      title:   f.title,
      snippet: `${f.status} · ${f.sprint.project.name} / ${f.sprint.name}`,
      score:   0.7,
    })));
  }

  // Search activities (decisions, events)
  if (!type || type === "event" || type === "decision") {
    const activities = await db.activity.findMany({
      where: {
        organisationId: orgId,
        OR: keywords.map(k => ({
          entityName: { contains: k, mode: "insensitive" as const },
        })),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    results.push(...activities.map(a => ({
      type:    "event",
      id:      a.id,
      title:   `${a.action}: ${a.entityName ?? ""}`,
      snippet: `${a.userName ?? "System"} · ${a.createdAt.toISOString().slice(0, 10)}`,
      score:   0.65,
    })));
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
