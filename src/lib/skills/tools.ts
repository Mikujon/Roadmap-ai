import { db } from "@/lib/prisma";
import { logActivity as _logActivity } from "@/lib/activity";

export async function createAlert(params: {
  orgId: string;
  projectId: string;
  type: string;
  level: string;
  title: string;
  detail: string;
  requiresValidation?: boolean;
  action?: string;
  dedupWindowHours?: number;
  dedupTitleContains?: string;
}): Promise<boolean> {
  const windowMs = (params.dedupWindowHours ?? 24) * 60 * 60 * 1000;
  const dedup = await db.alert.findFirst({
    where: {
      projectId: params.projectId,
      type: params.type,
      resolved: false,
      ...(params.dedupTitleContains
        ? { title: { contains: params.dedupTitleContains } }
        : {}),
      createdAt: { gte: new Date(Date.now() - windowMs) },
    },
  });
  if (dedup) return false;

  await db.alert.create({
    data: {
      organisationId: params.orgId,
      projectId: params.projectId,
      type: params.type,
      level: params.level.toLowerCase(),
      title: params.title,
      detail: params.detail,
      requiresValidation: params.requiresValidation ?? false,
      action: params.action,
    },
  });
  return true;
}

export async function logActivity(params: {
  orgId: string;
  projectId?: string;
  action: string;
  entity: string;
  entityId?: string;
  entityName?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  await _logActivity({
    organisationId: params.orgId,
    projectId: params.projectId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    entityName: params.entityName,
    meta: params.meta,
  });
}
