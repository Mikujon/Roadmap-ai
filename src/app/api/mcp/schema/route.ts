import { NextResponse } from "next/server";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain.com";

  return NextResponse.json({
    name: "RoadmapAI MCP Server",
    version: "1.0.0",
    description: "AI-powered PMO platform. Ingest project updates from any source.",
    endpoints: {
      ingest: `POST ${appUrl}/api/mcp/ingest`,
      projects: `GET ${appUrl}/api/v1/projects`,
      health: `GET ${appUrl}/api/v1/projects/[id]/health`,
    },
    supportedSources: ["jira", "gmail", "slack", "zoom", "teams", "linear", "github", "custom"],
    eventTypes: ["message", "email", "ticket_update", "transcript", "custom"],
    authentication: "Bearer token — get API key from Settings > Integrations",
  });
}
