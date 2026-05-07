import { withApiAuth } from "@/lib/api/route-handler";
import { executeTool } from "@/lib/agent/mcp-tools";
import { ok, Errors } from "@/lib/api/response";
import { z } from "zod";

const ExecuteSchema = z.object({
  tool:  z.string().min(1),
  input: z.record(z.string(), z.unknown()).default({}),
});

export const POST = withApiAuth(async (req, ctx) => {
  let body: z.infer<typeof ExecuteSchema>;
  try {
    body = ExecuteSchema.parse(await req.json());
  } catch (e: unknown) {
    const ze = e as { flatten?: () => unknown; message?: string };
    return Errors.VALIDATION(ze.flatten?.() ?? ze.message);
  }

  try {
    const result = await executeTool(body.tool, body.input, {
      orgId:     ctx.orgId,
      projectId: body.input.project_id as string | undefined,
      userId:    ctx.userId ?? "api-key",
    });

    if (result && typeof result === "object" && "error" in result) {
      return Errors.NOT_FOUND((result as { error: string }).error);
    }

    return ok({
      tool:        body.tool,
      result,
      executedAt:  new Date().toISOString(),
    });
  } catch (error) {
    console.error("[mcp/execute] tool error:", error);
    return Errors.INTERNAL(`Tool execution failed: ${String(error)}`);
  }
});
