"use client";
import { useState } from "react";
import { C, CARD, CARD_H, CARD_T, BTN, useToast, FG, FL, FI, FHINT, Modal } from "@/components/ui/shared";

type Status = "released"|"in_progress"|"planned"|"considering";
type View = "timeline"|"list";

interface RoadmapItem {
  label: string; sub: string; q: 1|2|3|4; span?: number;
  status: Status; version?: string; pct?: number; category: string;
}

const LANES: { emoji: string; name: string; items: RoadmapItem[] }[] = [
  { emoji: "🏗", name: "Core Platform", items: [
    { label: "PMO Dashboard",       sub: "Multi-role KPIs",              q: 1, status: "released",    version: "v1.0", category: "Core Platform" },
    { label: "Portfolio heatmap",   sub: "EVM aggregated scores",        q: 1, status: "released",    version: "v1.2", category: "Core Platform" },
    { label: "Kanban board",        sub: "Native drag & drop",           q: 2, status: "in_progress", pct: 72,         category: "Core Platform" },
    { label: "Multi-org support",   sub: "Switch org without logout",    q: 3, status: "planned",                      category: "Core Platform" },
  ]},
  { emoji: "🤖", name: "Guardian AI", items: [
    { label: "Risk scanner",             sub: "Automated risk analysis",            q: 1, status: "released",    version: "v1.0", category: "Guardian AI" },
    { label: "AI mitigation plans",      sub: "3 recommended actions per risk",     q: 2, status: "in_progress", pct: 45,         category: "Guardian AI" },
    { label: "Predictive EAC",           sub: "ML completion forecasting",          q: 3, status: "planned",                      category: "Guardian AI" },
    { label: "Natural language queries", sub: '"Which projects are over budget?"',  q: 4, status: "planned",                      category: "Guardian AI" },
  ]},
  { emoji: "🔌", name: "Integrations", items: [
    { label: "Jira bi-directional",  sub: "Task ↔ issue sync",                q: 1, status: "released", version: "v1.1", category: "Integrations" },
    { label: "Slack notifications",  sub: "Critical alerts → Slack channel",  q: 2, status: "planned",                  category: "Integrations" },
    { label: "GitHub Actions",       sub: "Deploy → update EV",               q: 3, status: "planned",                  category: "Integrations" },
    { label: "Microsoft Teams",      sub: "Meetings + approvals",              q: 4, status: "planned",                  category: "Integrations" },
  ]},
  { emoji: "📱", name: "Mobile & Reports", items: [
    { label: "Responsive web",    sub: "Tablet optimized",         q: 2, span: 2, status: "in_progress", pct: 30, category: "Core Platform" },
    { label: "Auto PDF reports",  sub: "Weekly / monthly digest",  q: 4,          status: "planned",              category: "Reports"       },
    { label: "iOS / Android app", sub: "Push approvals",           q: 4,          status: "considering",          category: "Mobile"        },
  ]},
];

const Q_LABELS = ["Q1 2025","Q2 2025","Q3 2025","Q4 2025"];
const Q_COLORS = ["#2563EB","#D97706","#9E9C93","#9E9C93"];

const STATUS_CFG: Record<Status, { bg: string; border: string; color: string; dot: string; round: boolean; label: string }> = {
  released:    { bg: "#F0FDF4", border: "#059669", color: "#15803D", dot: "#059669", round: true,  label: "Released"    },
  in_progress: { bg: "#EFF6FF", border: "#2563EB", color: "#1D4ED8", dot: "#2563EB", round: true,  label: "In progress" },
  planned:     { bg: "#F4F2EC", border: "#CCC9BF", color: "#5C5A52", dot: "#9E9C93", round: false, label: "Planned"     },
  considering: { bg: "#F5F3FF", border: "#C4B5FD", color: "#4C1D95", dot: "#7C3AED", round: false, label: "Considering" },
};

const CAT_CFG: Record<string, { bg: string; color: string; border: string }> = {
  "Core Platform": { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  "Guardian AI":   { bg: "#F5F3FF", color: "#4C1D95", border: "#C4B5FD" },
  "Integrations":  { bg: C.guardianLight, color: C.guardian, border: C.guardianBorder },
  "Reports":       { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  "Mobile":        { bg: "#FEF2F2", color: "#991B1B", border: "#FECACA" },
};

function StatusChip({ status, pct, version }: { status: Status; pct?: number; version?: string }) {
  const s = STATUS_CFG[status];
  const label = status === "released" ? `Released ${version ?? ""}` : status === "in_progress" ? `In progress — ${pct}%` : s.label;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 10, fontWeight: 700, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: s.round ? "50%" : 2, background: s.dot, flexShrink: 0 }} />
      {label}
    </div>
  );
}

function CategoryTag({ category }: { category: string }) {
  const c = CAT_CFG[category] ?? { bg: C.surface2, color: C.text2, border: C.border };
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: "nowrap" as const }}>{category}</span>;
}

function SuggestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-suggest" title="Suggest a feature" open={open} onClose={onClose}
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("primary")} onClick={onClose}>Send suggestion</button></>}>
      <div style={FG}><label style={FL}>Feature title <span style={{ color: C.red }}>*</span></label><input style={FI} type="text" placeholder="e.g. Automated monthly PDF report" /></div>
      <div style={FG}><label style={FL}>Category</label><select style={FI}><option>Core Platform</option><option>Guardian AI</option><option>Integrations</option><option>Reports & Export</option><option>Mobile</option><option>Other</option></select></div>
      <div style={FG}><label style={FL}>Why do you need this? <span style={{ color: C.red }}>*</span></label><textarea style={{ ...FI, minHeight: 80, resize: "vertical" }} placeholder="What problem does it solve?" /></div>
      <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Priority for you</label><select style={FI}><option>🔴 High — blocking my work</option><option>🟡 Medium — would improve efficiency</option><option>🟢 Low — nice to have</option></select></div>
    </Modal>
  );
}

export default function RoadmapPage() {
  const [view, setView] = useState<View>("timeline");
  const [showSuggest, setShowSuggest] = useState(false);
  const { show: toast, ToastContainer } = useToast();

  const allItems = LANES.flatMap(l => l.items);
  const released   = allItems.filter(i => i.status === "released");
  const inProgress = allItems.filter(i => i.status === "in_progress");
  const planned    = allItems.filter(i => i.status === "planned" || i.status === "considering");

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif", maxWidth: 1160 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Product Roadmap</h1>
          <p style={{ fontSize: 12, color: C.text3, margin: 0 }}>RoadmapAI · Platform development plan · Updated Q2 2025</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 2, gap: 2 }}>
            {(["timeline","list"] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", background: view === v ? C.guardian : "transparent", color: view === v ? "#fff" : C.text2, transition: ".12s" }}>
                {v === "timeline" ? "Timeline" : "List"}
              </button>
            ))}
          </div>
          <button style={BTN("default")} onClick={() => setShowSuggest(true)}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            Suggest a feature
          </button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        {(Object.entries(STATUS_CFG) as [Status, typeof STATUS_CFG[Status]][]).map(([k, s]) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: s.color }}>
            <span style={{ width: 8, height: 8, borderRadius: s.round ? "50%" : 2, background: s.border, display: "inline-block" }} />
            {s.label}
          </span>
        ))}
      </div>

      {/* ── TIMELINE VIEW ── */}
      {view === "timeline" && (
        <div>
          {/* Quarter headers */}
          <div style={{ display: "grid", gridTemplateColumns: "180px repeat(4,1fr)", gap: 0, marginBottom: 4 }}>
            <div />
            {Q_LABELS.map((q, i) => (
              <div key={q} style={{ textAlign: "center", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", paddingBottom: 8, color: i < 2 ? Q_COLORS[i] : C.text3, borderBottom: `2px solid ${Q_COLORS[i]}` }}>{q}</div>
            ))}
          </div>
          {/* Lanes */}
          {LANES.map(lane => (
            <div key={lane.name} style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: C.text3, marginBottom: 8, paddingLeft: 4 }}>
                {lane.emoji} {lane.name}
              </div>
              {lane.items.map(item => (
                <div key={item.label} style={{ display: "grid", gridTemplateColumns: "180px repeat(4,1fr)", gap: 0, alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, paddingRight: 8, paddingLeft: 4, lineHeight: 1.3 }}>
                    {item.label}<br />
                    <span style={{ fontSize: 10, fontWeight: 400, color: C.text3 }}>{item.sub}</span>
                  </div>
                  {[0,1,2,3].map(qi => {
                    const start = item.q - 1;
                    const end   = start + (item.span ?? 1);
                    if (qi === start) return (
                      <div key={qi} style={{ padding: "0 4px", gridColumn: item.span ? `span ${item.span}` : undefined }}>
                        <StatusChip status={item.status} pct={item.pct} version={item.version} />
                      </div>
                    );
                    if (item.span && qi > start && qi < end) return null;
                    return <div key={qi} />;
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Released */}
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#15803D", marginTop: 8, paddingBottom: 6, borderBottom: "2px solid #BBF7D0" }}>✓ Released</div>
          {released.map(item => (
            <div key={item.label} style={{ background: C.surface, border: "1px solid #BBF7D0", borderLeft: "3px solid #059669", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{item.label}</div><div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{item.sub} · {item.version} · {Q_LABELS[item.q - 1]}</div></div>
              <CategoryTag category={item.category} />
            </div>
          ))}
          {/* In progress */}
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#1D4ED8", marginTop: 14, paddingBottom: 6, borderBottom: "2px solid #BFDBFE" }}>⟳ In progress</div>
          {inProgress.map(item => (
            <div key={item.label} style={{ background: C.surface, border: "1px solid #BFDBFE", borderLeft: "3px solid #2563EB", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{item.label}</div><div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{item.sub} · {Q_LABELS[item.q - 1]}</div></div>
              {item.pct != null && (
                <div style={{ flexShrink: 0, width: 90 }}>
                  <div style={{ height: 5, background: "#EFF6FF", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${item.pct}%`, height: "100%", background: "#2563EB", borderRadius: 3 }} /></div>
                  <div style={{ fontSize: 9, color: "#1D4ED8", marginTop: 3, fontWeight: 700 }}>{item.pct}% done</div>
                </div>
              )}
              <CategoryTag category={item.category} />
            </div>
          ))}
          {/* Planned */}
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: C.text3, marginTop: 14, paddingBottom: 6, borderBottom: `2px solid ${C.border2}` }}>◻ Planned</div>
          {planned.map(item => (
            <div key={item.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px dashed ${C.border2}`, borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, opacity: .75 }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{item.label}</div><div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{item.sub} · {Q_LABELS[item.q - 1]}</div></div>
              <CategoryTag category={item.category} />
            </div>
          ))}
        </div>
      )}

      <SuggestModal open={showSuggest} onClose={() => { setShowSuggest(false); toast("Suggestion sent — thank you!","ok"); }} />
      <ToastContainer />
    </div>
  );
}
