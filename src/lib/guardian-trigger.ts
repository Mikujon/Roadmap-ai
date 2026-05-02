import { db } from "@/lib/prisma";
import { triggerAgents, type TriggerEvent } from "@/lib/agent-triggers";

/**
 * Backward-compat shim. New code should import triggerAgents from @/lib/agent-triggers directly.
 * Looks up organisationId so callers don't need to pass it.
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
      if (p) triggerAgents(event, projectId, p.organisationId);
    })
    .catch(() => {});
}
