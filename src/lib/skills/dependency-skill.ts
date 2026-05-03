import { db } from "@/lib/prisma";
import type { Skill, AgentContext, AgentResult } from "./types";
import { createAlert, logActivity } from "./tools";

export const dependencySkill: Skill = {
  id: "dependency-skill",
  name: "Dependency Monitor",
  description: "Detects cross-project and feature-level dependency blocks",
  version: "1.0.0",
  triggers: ["feature_blocked", "daily_sweep"],
};

export async function runDependencyAgent(ctx: AgentContext): Promise<AgentResult> {
  const { projectId, orgId } = ctx;
  let alertsCreated = 0;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      dependsOn: { include: { dependsOn: true } },
      sprints: {
        include: {
          features: {
            include: { blockedBy: { include: { blocker: true } } },
          },
        },
      },
    },
  });
  if (!project) return { success: false, agentId: "dependency-skill", message: "Project not found" };

  // Cross-project dependency check
  const blockedByProjects = project.dependsOn.filter(
    d => d.dependsOn.status !== "COMPLETED"
  );
  if (blockedByProjects.length > 0) {
    const created = await createAlert({
      orgId,
      projectId,
      type: "blocked",
      level: "warning",
      title: `${project.name} blocked by ${blockedByProjects.length} project dependency`,
      detail: blockedByProjects.map(d => d.dependsOn.name).join(", ") + " not yet completed",
      dedupTitleContains: "dependency",
    });
    if (created) {
      alertsCreated++;
      await logActivity({
        orgId,
        projectId,
        action: "agent.dependency_alert",
        entity: "project",
        entityId: projectId,
        entityName: project.name,
        meta: { blockedBy: blockedByProjects.map(d => d.dependsOn.name) },
      });
    }
  }

  // Feature-level dependency check
  const featuresBlockedByDeps = project.sprints
    .flatMap(s => s.features)
    .filter(f => f.blockedBy.some(dep => dep.blocker.status !== "DONE"));

  if (featuresBlockedByDeps.length >= 3) {
    const created = await createAlert({
      orgId,
      projectId,
      type: "blocked",
      level: "warning",
      title: `${featuresBlockedByDeps.length} features blocked by dependencies in ${project.name}`,
      detail: "Unresolved feature dependencies blocking sprint progress",
      dedupTitleContains: "blocked by dependencies",
    });
    if (created) alertsCreated++;
  }

  return { success: true, agentId: "dependency-skill", alertsCreated };
}
