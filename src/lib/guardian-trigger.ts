import { db } from "@/lib/prisma";
import type { TriggerEvent } from "@/lib/agent-triggers";
import { orchestrate } from "@/lib/orchestrator";

/**
 * Backward-compat shim.
 * Now delegates to the Agent Orchestrator.
 * New code should call orchestrate() directly.
 */
export function triggerGuardian(
  projectId: string,
  _projectName = "",
  event: TriggerEvent = "feature_updated"
): void {
  if (!projectId) return;
  db.project
    .findUnique({ where: { id: projectId }, select: { organisationId: true } })
    .then(p => {
      if (p) orchestrate(event, projectId, p.organisationId);
    })
    .catch(() => {});
}
