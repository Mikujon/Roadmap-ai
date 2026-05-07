type SSECallback = (event: string) => void;

interface SSEClient {
  id:          string;
  orgId:       string;
  callback:    SSECallback;
  connectedAt: Date;
}

class SSEManager {
  private clients: Map<string, SSEClient[]> = new Map();

  addClient(orgId: string, callback: SSECallback): string {
    const id = `${orgId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const client: SSEClient = { id, orgId, callback, connectedAt: new Date() };

    const existing = this.clients.get(orgId) ?? [];
    this.clients.set(orgId, [...existing, client]);

    console.log(`[sse] client connected: ${id} (org: ${orgId}, total: ${existing.length + 1})`);
    return id;
  }

  removeClient(orgId: string, clientId: string): void {
    const existing = this.clients.get(orgId) ?? [];
    const updated  = existing.filter(c => c.id !== clientId);
    if (updated.length === 0) {
      this.clients.delete(orgId);
    } else {
      this.clients.set(orgId, updated);
    }
    console.log(`[sse] client disconnected: ${clientId}`);
  }

  broadcast(orgId: string, event: SSEEvent): void {
    const clients = this.clients.get(orgId) ?? [];
    if (clients.length === 0) return;

    const payload = JSON.stringify(event);
    const dead: string[] = [];

    for (const client of clients) {
      try {
        client.callback(payload);
      } catch {
        dead.push(client.id);
      }
    }

    if (dead.length > 0) {
      this.clients.set(orgId, clients.filter(c => !dead.includes(c.id)));
    }
  }

  getClientCount(orgId: string): number {
    return (this.clients.get(orgId) ?? []).length;
  }
}

// Singleton — one instance shared across all requests in a Node.js process
export const sseManager = new SSEManager();

// ── SSE Event Types ────────────────────────────────────────────

export interface SSEEvent {
  type:       SSEEventType;
  orgId:      string;
  projectId?: string;
  timestamp:  string;
  data?:      Record<string, unknown>;
}

export type SSEEventType =
  | "connected"
  | "heartbeat"
  | "project.updated"
  | "project.health_changed"
  | "feature.status_changed"
  | "alert.created"
  | "risk.added"
  | "sprint.closed"
  | "orchestration.complete"
  | "guardian.analysis_complete";

// ── Broadcast helper ───────────────────────────────────────────

export function broadcastToOrg(
  orgId:      string,
  type:       SSEEventType,
  projectId?: string,
  data?:      Record<string, unknown>,
): void {
  sseManager.broadcast(orgId, {
    type,
    orgId,
    projectId,
    timestamp: new Date().toISOString(),
    data,
  });
}
