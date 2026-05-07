import { getAuthContext } from "@/lib/auth";
import { sseManager } from "@/lib/sse/manager";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }

  const orgId = ctx.org.id;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({
          type:      "connected",
          orgId,
          timestamp: new Date().toISOString(),
        })}\n\n`)
      );

      // Register this client
      const clientId = sseManager.addClient(orgId, (event: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        } catch {
          // Client disconnected — will be cleaned up on abort
        }
      });

      // Heartbeat every 30s to keep connection alive through proxies
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`)
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        sseManager.removeClient(orgId, clientId);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":                "text/event-stream",
      "Cache-Control":               "no-cache, no-store",
      "Connection":                  "keep-alive",
      "X-Accel-Buffering":           "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
