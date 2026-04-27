"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { C, CARD, CARD_H, CARD_T, CARD_S, CARD_BODY, G2, G3, BTN, Tag, Dot, Row, MemberRow, useToast, FG, FL, FI } from "@/components/ui/shared";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ModalClosureReport, ModalInvite, ModalEditRole } from "@/components/ui/project-modals";

// ─────────────────────────────────────────────
// ARCHIVE PAGE
// ─────────────────────────────────────────────
export function ArchivePage() {
  const [showReport, setShowReport] = useState(false);
  const { show: toast, ToastContainer } = useToast();

  const projects = [
    { dot: "g" as const, name: "Legacy CRM Migration",    meta: "Dec 2025 · Score 84 · Final CPI 1.02", statusV: "g" as const, status: "Completed",        hasReport: true  },
    { dot: "gr" as const, name: "Internal Wiki Overhaul",  meta: "Nov 2025 · cancelled",                 statusV: "n" as const, status: "Archived",         hasReport: false },
    { dot: "r" as const, name: "Payments v2 Rebuild",     meta: "Oct 2025 · Score 41 · CPI 0.71",        statusV: "r" as const, status: "Closed — cancelled", hasReport: true },
    { dot: "g" as const, name: "HR Portal Redesign",       meta: "Sep 2025 · Score 91 · Final CPI 1.15",  statusV: "g" as const, status: "Completed",        hasReport: true  },
  ];

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Archive</h1>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>Closed and archived projects · AI closure reports available</p>
        </div>
        <button style={BTN("sm")} onClick={() => toast("Filter applied","ok")}>Filter</button>
      </div>

      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Closed projects</span><span style={CARD_S}>closure reports auto-generated</span></div>
        {projects.map((p, i) => (
          <Row key={i}>
            <Dot c={p.dot} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{p.name}</div>
              <div style={{ fontSize: 10, color: C.text3 }}>{p.meta}</div>
            </div>
            <Tag v={p.statusV}>{p.status}</Tag>
            {p.hasReport && (
              <button style={{ ...BTN("sm"), marginLeft: 8 }} onClick={() => setShowReport(true)}>Closure report ↗</button>
            )}
            {!p.hasReport && (
              <button style={{ ...BTN("sm"), marginLeft: 8 }} onClick={() => toast("Opening…","ok")}>View</button>
            )}
          </Row>
        ))}
      </div>

      <ModalClosureReport open={showReport} onClose={() => setShowReport(false)} />
      <ToastContainer />
    </div>
  );
}

// ─────────────────────────────────────────────
// TEAM PAGE
// ─────────────────────────────────────────────
export function TeamPage() {
  const [showInvite, setShowInvite] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  const { show: toast, ToastContainer } = useToast();

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Team</h1>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>Members · roles · invitations · Acme Corp</p>
        </div>
        <button style={BTN("primary", { fontSize: 10, padding: "4px 9px" })} onClick={() => setShowInvite(true)}>+ Invite member</button>
      </div>

      <div style={G2}>
        <div style={CARD}>
          <div style={CARD_H}><span style={CARD_T}>Members</span><span style={CARD_S}>3 active</span></div>
          <MemberRow initials="LP" avatarBg="#111" avatarColor="#fff" name="Laura Pinto" sub="laura@acme.com · Admin · Jan 2025">
            <Tag v="g">Admin</Tag>
            <button style={{ ...BTN("sm"), marginLeft: 8 }} onClick={() => setShowEditRole(true)}>Edit role</button>
          </MemberRow>
          <MemberRow initials="MR" avatarBg={C.blueBg} avatarColor={C.blueText} name="Marco Rossi" sub="marco@acme.com · Manager · Feb 2025">
            <Tag v="b">Manager</Tag>
            <button style={{ ...BTN("sm"), marginLeft: 8 }} onClick={() => setShowEditRole(true)}>Edit</button>
            <button style={{ ...BTN("danger", { fontSize: 10, padding: "3px 8px" }), marginLeft: 4 }} onClick={() => toast("Member removed","ok")}>Remove</button>
          </MemberRow>
          <MemberRow initials="GF" avatarBg={C.tealBg} avatarColor={C.tealText} name="Giulia Ferri" sub="giulia@acme.com · Stakeholder view">
            <Tag v="n">Viewer</Tag>
            <button style={{ ...BTN("sm"), marginLeft: 8 }} onClick={() => setShowEditRole(true)}>Edit</button>
          </MemberRow>
        </div>

        <div>
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Pending invitations</span></div>
            <Row>
              <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.text }}>dev@acme.com</div>
              <Tag v="b">Manager</Tag>
              <div style={{ fontSize: 11, color: C.text2 }}>expires Apr 17</div>
              <button style={{ ...BTN("sm"), marginLeft: 8 }} onClick={() => toast("Invitation resent","ok")}>Resend</button>
              <button style={BTN("danger", { fontSize: 10, padding: "3px 8px" })} onClick={() => toast("Invitation cancelled","ok")}>Cancel</button>
            </Row>
            <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}` }}>
              <button style={BTN("primary", { fontSize: 10, padding: "4px 9px" })} onClick={() => setShowInvite(true)}>+ New invitation</button>
            </div>
          </div>

          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Permissions by role</span></div>
            {[["Admin","All actions · delete projects · billing · team"],["Manager","Create/edit projects · features · risks · invitations"],["Viewer","Read only · financials visible · no write access"]].map(([role, desc]) => (
              <Row key={role}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text, width: 80 }}>{role}</div>
                <div style={{ fontSize: 11, color: C.text2 }}>{desc}</div>
              </Row>
            ))}
          </div>
        </div>
      </div>

      <ModalInvite   open={showInvite}   onClose={() => { setShowInvite(false);   toast("Invitation sent","ok"); }} />
      <ModalEditRole open={showEditRole} onClose={() => { setShowEditRole(false); toast("Role updated","ok"); }} />
      <ToastContainer />
    </div>
  );
}

// ─────────────────────────────────────────────
// INTEGRATIONS PAGE
// ─────────────────────────────────────────────
interface IntegrationStatus {
  connected: boolean;
  messagesToday: number;
  lastMessage: string;
  insights: number;
}

const INTEGRATIONS = [
  {
    letter: "S", letterBg: "#4A154B", name: "Slack", connected: false,
    desc: "Guardian alerts, milestone notifications and PMO approval requests. Ambient AI monitors #project-* channels.",
    statusText: "Not connected",
  },
  {
    letter: "G", letterBg: "#4285F4", name: "Gmail", connected: false,
    desc: "Monitor project emails for decisions, scope changes and action items. Auto-extract PM intelligence.",
    statusText: "Not connected",
  },
  {
    letter: "Z", letterBg: "#2D8CFF", name: "Zoom", connected: false,
    desc: "Auto-analyze meeting transcripts for decisions, risks and action items. Guardian AI attends every meeting.",
    statusText: "Not connected",
  },
  {
    letter: "T", letterBg: "#5B5EA6", name: "MS Teams", connected: false,
    desc: "Weekly PMO reports and Guardian alerts in Teams channels. Project intelligence on autopilot.",
    statusText: "Not connected",
  },
  {
    letter: "J", letterBg: "#0052CC", name: "Jira", connected: true,
    desc: "Issues, sprints, epics synced bidirectionally. Jira epics → phases, sprints → sprints, issues → features.",
    statusText: "✓ Connected · 14 issues · Customer Portal",
  },
  {
    letter: "⌥", letterBg: "#181717", name: "GitHub", connected: false,
    desc: "Link PRs and commits to features. Task closes automatically on PR merge. Sprint completion triggers on deploy.",
    statusText: "Not connected",
  },
  {
    letter: "L", letterBg: "#5E6AD2", name: "Linear", connected: false,
    desc: "Sync Linear issues and cycles with RoadmapAI sprints and features bidirectionally.",
    statusText: "Not connected",
  },
  {
    letter: "N", letterBg: C.surface3, name: "Notion", connected: false, soon: true,
    desc: "Export Guardian reports and closure documents to Notion workspace automatically.",
    statusText: "Coming soon",
  },
];

function IntegrationCard({ int }: { int: typeof INTEGRATIONS[0] }) {
  const { show: toast, ToastContainer } = useToast();
  
  return (
    <div style={{
      background: int.connected ? C.guardianLight : C.surface,
      border: `1px solid ${int.connected ? C.guardianBorder : C.border}`,
      borderRadius: 12, padding: 16, transition: ".15s",
      opacity: int.soon ? .65 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: int.letterBg, color: int.letterBg === C.surface3 ? C.text2 : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{int.letter}</div>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-.3px" }}>{int.name}</div>
        {int.soon && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: C.surface2, color: C.text2, border: `1px solid ${C.border}` }}>v2</span>}
      </div>
      <p style={{ fontSize: 11, color: C.text2, lineHeight: 1.5, marginBottom: 10 }}>{int.desc}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: int.connected ? C.guardian : int.soon ? C.text3 : C.text3 }}>{int.statusText}</span>
        {int.connected && (
          <div style={{ display: "flex", gap: 6 }}>
            <button style={BTN("sm")} onClick={() => toast("Opening config…","ok")}>Configure</button>
            <button style={BTN("danger", { fontSize: 10, padding: "3px 8px" })} onClick={() => toast("Disconnected","warn")}>Disconnect</button>
          </div>
        )}
        {!int.connected && !int.soon && (
          <button style={BTN("primary", { fontSize: 10, padding: "4px 9px" })} onClick={() => toast(`Connecting ${int.name}…`,"ok")}>Connect →</button>
        )}
        {int.soon && (
          <button style={{ ...BTN("sm"), opacity: .5 }} disabled>Notify me</button>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

interface IngestionLogEntry {
  id: string;
  platform: string;
  type: string;
  sender: string;
  summary: string | null;
  confidence: number | null;
  applied: boolean;
  createdAt: string;
  projectId: string | null;
  projectIdRelation: { name: string } | null;
}

const SOURCE_COLORS: Record<string, string> = {
  jira: "#0052CC", gmail: "#EA4335", slack: "#4A154B", zoom: "#2D8CFF",
  teams: "#5B5EA6", linear: "#5E6AD2", github: "#181717", custom: C.guardian,
};

function ApiKeySection() {
  const { show: toast, ToastContainer } = useToast();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [masked, setMasked] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [loading, setLoading] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "https://your-domain.com");

  useEffect(() => {
    fetch("/api/settings/api-key")
      .then(r => r.json())
      .then(d => { setApiKey(d.apiKey); setMasked(d.masked); })
      .catch(() => {});
  }, []);

  const handleCopy = useCallback(() => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(() => toast("API key copied", "ok"));
  }, [apiKey, toast]);

  const handleRegenerate = useCallback(async () => {
    if (!confirmRegen) { setConfirmRegen(true); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/settings/api-key", { method: "POST" });
      const d = await r.json();
      setApiKey(d.apiKey);
      setMasked(d.masked);
      setShowFull(true);
      setConfirmRegen(false);
      toast("New API key generated — copy it now", "ok");
    } catch {
      toast("Failed to regenerate", "warn");
    } finally {
      setLoading(false);
    }
  }, [confirmRegen, toast]);

  const curlExample = `curl -X POST ${appUrl}/api/mcp/ingest \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "custom",
    "orgId": "YOUR_ORG_ID",
    "events": [{
      "type": "message",
      "content": "Sprint 3 delayed by 5 days due to auth dependency",
      "sender": "john@company.com",
      "timestamp": "${new Date().toISOString()}"
    }]
  }'`;

  return (
    <div style={{ ...CARD, marginBottom: 20 }}>
      <div style={CARD_H}>
        <span style={CARD_T}>API & MCP</span>
        <span style={CARD_S}>Universal ingestion endpoint · any agent can push updates</span>
      </div>

      {/* API Key row */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>API Key</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <code style={{
            flex: 1, fontFamily: "monospace", fontSize: 12,
            background: C.surface2, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "6px 10px", color: C.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {apiKey === null ? "Loading…" : (showFull && apiKey ? apiKey : (masked ?? "No key — click Regenerate"))}
          </code>
          {apiKey && (
            <button style={BTN("sm")} onClick={() => setShowFull(v => !v)}>
              {showFull ? "Hide" : "Show"}
            </button>
          )}
          <button style={BTN("sm")} onClick={handleCopy} disabled={!apiKey}>Copy</button>
          <button
            style={{ ...BTN(confirmRegen ? "danger" : "sm", { fontSize: 10, padding: "3px 8px" }), minWidth: 90 }}
            onClick={handleRegenerate}
            disabled={loading}
          >
            {loading ? "Generating…" : confirmRegen ? "Confirm regen?" : "Regenerate"}
          </button>
          {confirmRegen && (
            <button style={BTN("sm")} onClick={() => setConfirmRegen(false)}>Cancel</button>
          )}
        </div>
      </div>

      {/* MCP server URL */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>MCP Server URL</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <code style={{
            flex: 1, fontFamily: "monospace", fontSize: 12,
            background: C.surface2, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "6px 10px", color: C.guardian,
          }}>
            {appUrl}/api/mcp/ingest
          </code>
          <button style={BTN("sm")} onClick={() => {
            navigator.clipboard.writeText(`${appUrl}/api/mcp/ingest`);
            toast("URL copied", "ok");
          }}>Copy</button>
        </div>
      </div>

      {/* curl example */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Example request</div>
        <pre style={{
          fontFamily: "monospace", fontSize: 10, lineHeight: 1.6,
          background: "#0d1117", color: "#c9d1d9",
          borderRadius: 8, padding: 14, margin: 0,
          overflow: "auto", whiteSpace: "pre",
        }}>{curlExample}</pre>
      </div>

      <ToastContainer />
    </div>
  );
}

function IngestionLog() {
  const [entries, setEntries] = useState<IngestionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/ingestion-log")
      .then(r => r.json())
      .then(d => setEntries(d.messages ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ ...CARD, marginBottom: 20 }}>
      <div style={CARD_H}>
        <span style={CARD_T}>Recent ingestions</span>
        <span style={CARD_S}>Last 20 messages processed by MCP</span>
      </div>

      {loading && (
        <div style={{ padding: "16px", fontSize: 12, color: C.text3 }}>Loading…</div>
      )}

      {!loading && entries.length === 0 && (
        <div style={{ padding: "20px 16px", fontSize: 12, color: C.text3, textAlign: "center" }}>
          No ingestions yet. POST to /api/mcp/ingest to get started.
        </div>
      )}

      {entries.map(e => (
        <Row key={e.id}>
          <div style={{
            fontSize: 9, fontWeight: 800, letterSpacing: ".05em",
            padding: "2px 7px", borderRadius: 4,
            background: SOURCE_COLORS[e.platform] ?? C.surface2,
            color: "#fff", flexShrink: 0, textTransform: "uppercase",
          }}>
            {e.platform}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.summary ?? e.type}
            </div>
            <div style={{ fontSize: 10, color: C.text3 }}>
              {e.sender}{e.projectIdRelation ? ` · ${e.projectIdRelation.name}` : ""}
              {e.confidence != null ? ` · ${Math.round(e.confidence * 100)}% confidence` : ""}
            </div>
          </div>
          <Tag v={e.applied ? "g" : "n"}>{e.applied ? "Applied" : "Skipped"}</Tag>
          <div style={{ fontSize: 10, color: C.text3, flexShrink: 0 }}>
            {new Date(e.createdAt).toLocaleString()}
          </div>
        </Row>
      ))}
    </div>
  );
}

export function IntegrationsPage() {
  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Breadcrumb items={[{ label: "Settings", href: "/settings" }, { label: "Integrations" }]} />
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Integrations</h1>
        <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>Connect your tools · bidirectional synchronization</p>
      </div>

      <ApiKeySection />
      <IngestionLog />

      <div style={G2}>
        {INTEGRATIONS.map((int, i) => (
          <IntegrationCard key={i} int={int} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BILLING PAGE
// ─────────────────────────────────────────────
const PLANS = [
  {
    name: "Free", price: "€0", period: "per month", current: false,
    features: ["10 projects","1 member","No AI agents","Basic EVM"],
    cta: "Downgrade", ctaV: "default" as const,
  },
  {
    name: "Pro", price: "€29", period: "per month", current: true,
    features: ["30 projects","10 members","Guardian AI","Full EVM + alerts"],
    cta: "Manage", ctaV: "default" as const,
  },
  {
    name: "Business", price: "€99", period: "per month", current: false,
    features: ["Unlimited projects","Unlimited members","All agents + portfolio","Priority support"],
    cta: "Upgrade →", ctaV: "primary" as const,
  },
];

export function BillingPage() {
  const { show: toast, ToastContainer } = useToast();

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Billing</h1>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>Subscription · Stripe · current: Pro</p>
        </div>
        <button style={BTN("sm")} onClick={() => toast("Opening Stripe portal…","ok")}>Manage via Stripe</button>
      </div>

      {/* Plans */}
      <div style={{ ...G3, marginBottom: 16 }}>
        {PLANS.map(plan => (
          <div key={plan.name} style={{
            background: plan.current ? C.blueBg : C.surface,
            border: `${plan.current ? 2 : 1}px solid ${plan.current ? C.blue : C.border}`,
            borderRadius: 16, padding: 20, transition: ".2s",
          }}>
            {plan.current && (
              <div style={{ fontSize: 9, background: C.blue, color: "#fff", padding: "2px 9px", borderRadius: 9, display: "inline-block", marginBottom: 8, fontWeight: 800, letterSpacing: ".05em" }}>CURRENT PLAN</div>
            )}
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{plan.name}</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", marginBottom: 2 }}>{plan.price}</div>
            <div style={{ fontSize: 10, color: C.text3, marginBottom: 14 }}>{plan.period}</div>
            <ul style={{ listStyle: "none", fontSize: 11, color: C.text2, lineHeight: 2, marginBottom: 16 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: C.guardian }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <button style={{ ...BTN(plan.ctaV), width: "100%", justifyContent: "center" }} onClick={() => toast(plan.cta === "Upgrade →" ? "Opening upgrade…" : "Managing plan…","ok")}>{plan.cta}</button>
          </div>
        ))}
      </div>

      {/* Usage meters */}
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Current usage</span><span style={CARD_S}>Pro plan · renewal May 10</span></div>
        {[["Projects","47%","14 / 30",C.blue],["Members","30%","3 / 10",C.blue],["AI generations","72%","72 / 100",C.amber]].map(([label, pct, val, color]) => (
          <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, width: 100, flexShrink: 0 }}>{label}</div>
            <div style={{ flex: 1, height: 6, background: C.surface2, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: pct as string, height: "100%", background: color as string, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 11, color: C.text2, width: 55, textAlign: "right", flexShrink: 0 }}>{val}</div>
          </div>
        ))}
      </div>

      <ToastContainer />
    </div>
  );
}
