import { NextResponse } from "next/server";
import { getAllSkills } from "@/lib/skills";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain.com";

  return NextResponse.json({
    name:        "RoadmapAI MCP Server",
    version:     "1.1.0",
    description: "AI-powered PMO platform. Ingest project updates from any source, query project intelligence, and execute AI skills.",
    endpoints: {
      ingest:   `POST  ${appUrl}/api/mcp/ingest`,
      projects: `GET   ${appUrl}/api/v1/projects`,
      health:   `GET   ${appUrl}/api/v1/projects/[id]/health`,
      tools:    `GET   ${appUrl}/api/mcp/tools`,
      execute:  `POST  ${appUrl}/api/mcp/execute`,
      skills:   `POST  ${appUrl}/api/mcp/skills/:skillId`,
    },
    supportedSources: ["jira", "gmail", "slack", "zoom", "teams", "linear", "github", "custom"],
    eventTypes:       ["message", "email", "ticket_update", "transcript", "custom"],
    authentication:   "Bearer token — get API key from Settings > Integrations",
    availableSkills:  getAllSkills().map(s => ({
      id:          s.id,
      name:        s.name,
      description: s.description,
      triggers:    s.triggers,
    })),
  });
}
