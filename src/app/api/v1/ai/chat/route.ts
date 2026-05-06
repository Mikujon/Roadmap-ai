import { getAuthContext } from "@/lib/auth";
import { runAgentLoop, AgentMessage } from "@/lib/agent/loop";
import { db } from "@/lib/prisma";
import { ok, Errors } from "@/lib/api/response";

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return Errors.UNAUTHORIZED();

  const body = await req.json() as {
    message?:   string;
    projectId?: string;
    history?:   AgentMessage[];
  };

  if (!body.message?.trim()) return Errors.VALIDATION("message is required");

  const { message, projectId, history = [] } = body;

  const org = await db.organisation.findUnique({
    where:  { id: ctx.org.id },
    select: { name: true },
  });

  let projectName: string | undefined;
  if (projectId) {
    const project = await db.project.findFirst({
      where:  { id: projectId, organisationId: ctx.org.id },
      select: { name: true },
    });
    projectName = project?.name;
  }

  try {
    const result = await runAgentLoop(
      message,
      history.slice(-10),
      {
        orgId:       ctx.org.id,
        orgName:     org?.name ?? "Your Organisation",
        userId:      ctx.user.id,
        userRole:    ctx.role,
        projectId,
        projectName,
      },
    );

    return ok({
      message:          result.response,
      toolsUsed:        result.toolsUsed,
      actionsPerformed: result.actionsPerformed,
      iterations:       result.iterations,
    });
  } catch (error) {
    console.error("[ai/chat] agent loop failed:", error);
    return Errors.INTERNAL("AI agent failed to respond");
  }
}
