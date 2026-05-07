import { MCP_TOOLS } from "@/lib/agent/mcp-tools";
import { ok } from "@/lib/api/response";

const WRITE_TOOLS = new Set([
  "create_feature",
  "create_risk",
  "update_feature_status",
  "suggest_mitigation",
  "update_project_budget",
]);

function isWriteTool(name: string): boolean {
  return WRITE_TOOLS.has(name);
}

export async function GET() {
  return ok({
    tools: MCP_TOOLS.map(t => ({
      name:         t.name,
      description:  t.description,
      type:         isWriteTool(t.name) ? "WRITE" : "READ",
      input_schema: t.input_schema,
    })),
    total:      MCP_TOOLS.length,
    readTools:  MCP_TOOLS.filter(t => !isWriteTool(t.name)).length,
    writeTools: MCP_TOOLS.filter(t =>  isWriteTool(t.name)).length,
  });
}
