import { db } from "./prisma";

interface LogActivityParams {
  organisationId: string;
  projectId?:     string;
  userId?:        string;
  userName?:      string;
  action:         string;  // e.g. "project.status_changed", "feature.blocked"
  entity:         string;  // e.g. "project", "feature", "sprint"
  entityId?:      string;
  entityName?:    string;
  meta?:          Record<string, any>;
}

export async function logActivity(params: LogActivityParams) {
  try {
    await db.activity.create({
      data: {
        organisationId: params.organisationId,
        projectId:      params.projectId,
        userId:         params.userId,
        userName:       params.userName,
        action:         params.action,
        entity:         params.entity,
        entityId:       params.entityId,
        entityName:     params.entityName,
        meta:           params.meta ?? {},
      },
    });
  } catch (e) {
    // Never throw — activity log should never break the main flow
    console.error("Activity log error:", e);
  }
}