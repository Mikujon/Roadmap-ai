"use client";
import { useState } from "react";
import { C, CARD, CARD_H, CARD_T, CARD_S, CARD_BODY, BTN, Row, MemberRow, useToast, FG, FL, FI, FHINT, FROW } from "@/components/ui/shared";
import { ModalDeleteOrg } from "@/components/ui/project-modals";

// ── Reusable Toggle ──
function Toggle({ on = false, onChange }: { on?: boolean; onChange?: (v: boolean) => void }) {
  const [active, setActive] = useState(on);
  const toggle = () => { setActive(a => !a); onChange?.(!active); };
  return (
    <div onClick={toggle} style={{ width: 36, height: 20, borderRadius: 10, cursor: "pointer", background: active ? C.guardian : C.text3, position: "relative", transition: ".2s", flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: active ? 18 : 2, transition: ".2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
    </div>
  );
}

// ── Tab: Profile ──
function TabProfile({ toast }: { toast: (m: string, t?: any) => void }) {
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Your profile</span></div>
        <div style={CARD_BODY}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.guardian, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, flexShrink: 0 }}>LP</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Laura Pinto</div>
              <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>laura.pinto@acme.com · PMO Manager</div>
              <button style={{ ...BTN("sm"), marginTop: 8 }} onClick={() => toast("Upload not available in demo","warn")}>Change avatar</button>
            </div>
          </div>
          <div style={FROW}>
            <div style={FG}><label style={FL}>First name</label><input style={FI} type="text" defaultValue="Laura" /></div>
            <div style={FG}><label style={FL}>Last name</label><input style={FI} type="text" defaultValue="Pinto" /></div>
          </div>
          <div style={FG}>
            <label style={FL}>Work email</label>
            <input style={{ ...FI, opacity: .55 }} type="email" defaultValue="laura.pinto@acme.com" disabled />
            <span style={FHINT}>Email cannot be changed — contact admin</span>
          </div>
          <div style={FG}>
            <label style={FL}>Role in organisation</label>
            <input style={{ ...FI, opacity: .55 }} type="text" defaultValue="PMO Manager" disabled />
            <span style={FHINT}>Editable by admin only</span>
          </div>
          <div style={FROW}>
            <div style={FG}><label style={FL}>Timezone</label><select style={FI}><option>Europe/Rome (UTC+2)</option><option>Europe/London (UTC+1)</option><option>America/New_York (UTC-4)</option><option>Asia/Tokyo (UTC+9)</option></select></div>
            <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Language</label><select style={FI}><option>English</option><option>Italiano</option><option>Español</option><option>Français</option></select></div>
          </div>
        </div>
      </div>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Default view</span></div>
        <div style={CARD_BODY}>
          <div style={FG}><label style={FL}>Landing page</label><select style={FI}><option>Dashboard</option><option>Portfolio</option><option>Alerts</option><option>Last visited</option></select></div>
          <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Default role on login</label><select style={FI}><option>PMO</option><option>CEO</option><option>Stakeholder</option><option>Developer</option></select></div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Organisation ──
function TabOrg({ toast, onDeleteOrg }: { toast: (m: string, t?: any) => void; onDeleteOrg: () => void }) {
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Organisation details</span></div>
        <div style={CARD_BODY}>
          <div style={FG}><label style={FL}>Organisation name</label><input style={FI} type="text" defaultValue="Acme Corp" /></div>
          <div style={FG}><label style={FL}>URL slug</label><input style={FI} type="text" defaultValue="acme-corp" /><span style={FHINT}>roadmapai.com/<strong>acme-corp</strong></span></div>
          <div style={FG}><label style={FL}>Logo URL</label><input style={FI} type="text" placeholder="https://…" /></div>
          <div style={FROW}>
            <div style={FG}><label style={FL}>Timezone</label><select style={FI}><option>Europe/Rome (UTC+2)</option><option>UTC</option><option>America/New_York (UTC-4)</option></select></div>
            <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Currency</label><select style={FI}><option>EUR (€)</option><option>USD ($)</option><option>GBP (£)</option></select></div>
          </div>
          <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Industry</label><select style={FI}><option>IT / Software</option><option>Manufacturing</option><option>Finance</option><option>Healthcare</option><option>Retail</option><option>Public sector</option></select></div>
        </div>
      </div>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Default operational thresholds</span><span style={CARD_S}>Applied to all new projects</span></div>
        <div style={CARD_BODY}>
          <div style={FROW}>
            <div style={FG}><label style={FL}>Budget warning (%)</label><input style={FI} type="number" defaultValue={80} min={50} max={99} /><span style={FHINT}>Alert when spent ≥ N% of BAC</span></div>
            <div style={FG}><label style={FL}>Budget critical (%)</label><input style={FI} type="number" defaultValue={95} min={50} max={105} /></div>
          </div>
          <div style={FROW}>
            <div style={FG}><label style={FL}>Schedule warning (days)</label><input style={FI} type="number" defaultValue={14} /><span style={FHINT}>Alert if deadline within N days</span></div>
            <div style={FG}><label style={FL}>Schedule critical (days)</label><input style={FI} type="number" defaultValue={7} /></div>
          </div>
          <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Risk score alert threshold</label><input style={FI} type="number" defaultValue={12} min={1} max={25} /><span style={FHINT}>Auto-alert for risks with P×I ≥ N (scale 1–25)</span></div>
        </div>
      </div>
      <div style={{ ...CARD, borderColor: C.redBorder }}>
        <div style={{ ...CARD_H, borderBottomColor: C.redBorder }}><span style={{ ...CARD_T, color: C.redText }}>⚠ Danger zone</span></div>
        <div style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Delete organisation</div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>Permanently delete all projects and data. Cannot be undone.</div>
          </div>
          <button style={BTN("danger", { fontSize: 10, padding: "4px 9px" })} onClick={onDeleteOrg}>Delete org</button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Guardian AI ──
function TabGuardian() {
  const agents = [
    { emoji: "🛡", name: "Guardian Risk Agent",  sub: "Monitors risks and generates alerts",       on: true  },
    { emoji: "💰", name: "Financial Agent",       sub: "Analyses EVM and budget overruns",          on: true  },
    { emoji: "🔗", name: "Dependency Agent",      sub: "Detects blocking dependencies",             on: true  },
    { emoji: "📅", name: "Schedule Agent",        sub: "Analyses delays and deadlines",             on: false },
  ];
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Guardian AI alert thresholds</span><span style={CARD_S}>Active on all projects</span></div>
        <div style={CARD_BODY}>
          <div style={FROW}>
            <div style={FG}><label style={FL}>CPI — warning threshold</label><input style={FI} type="number" defaultValue={0.90} step={0.01} min={0.5} max={1.0} /><span style={FHINT}>Alert if CPI drops below this</span></div>
            <div style={FG}><label style={FL}>CPI — critical threshold</label><input style={FI} type="number" defaultValue={0.80} step={0.01} min={0.5} max={1.0} /></div>
          </div>
          <div style={FROW}>
            <div style={FG}><label style={FL}>SPI — warning threshold</label><input style={FI} type="number" defaultValue={0.90} step={0.01} min={0.5} max={1.0} /></div>
            <div style={FG}><label style={FL}>SPI — critical threshold</label><input style={FI} type="number" defaultValue={0.80} step={0.01} min={0.5} max={1.0} /></div>
          </div>
          <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Risk score auto-alert threshold</label><input style={FI} type="number" defaultValue={12} min={1} max={25} /><span style={FHINT}>Guardian creates alert for every risk with P×I ≥ N</span></div>
        </div>
      </div>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Scan frequency</span></div>
        <div style={CARD_BODY}>
          <div style={FG}><label style={FL}>Automatic Guardian scan</label><select style={FI}><option>Every hour</option><option>Every 4 hours</option><option>Every day (08:00)</option><option>Disabled</option></select></div>
          <div style={FG}><label style={FL}>Dashboard insights generation</label><select style={FI}><option>On every page load</option><option>Every 4 hours (cached)</option><option>Manual only</option></select></div>
          <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Automated AI report</label><select style={FI}><option>Every Monday 08:00</option><option>Disabled</option><option>End of sprint</option></select></div>
        </div>
      </div>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Active agents</span><span style={CARD_S}>Enable / disable individually</span></div>
        <div style={CARD_BODY}>
          {agents.map((a, i) => (
            <div key={a.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < agents.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{a.emoji} {a.name}</div>
                <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{a.sub}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Toggle on={a.on} />
                <span style={{ fontSize: 11, fontWeight: 600, color: a.on ? C.greenText : C.text3, minWidth: 44 }}>{a.on ? "Active" : "Off"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Notifications ──
function TabNotifications() {
  const events = [
    { label: "Critical risk detected",  sub: "Guardian AI identifies risk P×I ≥ 12",      email: true,  push: false },
    { label: "CPI below threshold",     sub: "CPI drops below configured threshold",       email: true,  push: true  },
    { label: "Approval required",       sub: "Scope change or budget update pending",      email: true,  push: true  },
    { label: "Sprint completed",        sub: "Sprint closed with velocity summary",        email: true,  push: false },
    { label: "Task assigned to me",     sub: "New Kanban task assigned to you",            email: false, push: true  },
    { label: "Weekly AI report",        sub: "Guardian digest every Monday morning",       email: true,  push: false },
  ];
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Notification channels</span></div>
        <div style={CARD_BODY}>
          {[
            { icon: "📧", label: "Email",        sub: "laura.pinto@acme.com",              on: true,  freq: true  },
            { icon: "💬", label: "Slack",        sub: "Not connected — connect Slack first", on: false, freq: false },
            { icon: "🔔", label: "Push browser", sub: "Real-time desktop notifications",   on: false, freq: false },
          ].map((ch, i, arr) => (
            <div key={ch.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div><div style={{ fontSize: 12, fontWeight: 600 }}>{ch.icon} {ch.label}</div><div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{ch.sub}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {ch.freq && <select style={{ ...FI, width: 130, padding: "4px 8px", fontSize: 11 }}><option>Immediately</option><option>Daily digest</option><option>Critical only</option></select>}
                <Toggle on={ch.on} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Notification types</span><span style={CARD_S}>Choose what you receive</span></div>
        <div style={CARD_BODY}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, fontSize: 9, fontWeight: 700, color: C.text3, letterSpacing: ".06em", textTransform: "uppercase", paddingBottom: 8, borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
            <div>Event</div><div>Email</div><div>Push</div>
          </div>
          {events.map((ev, i) => (
            <div key={ev.label} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < events.length - 1 ? `1px solid #F4F2EC` : "none" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{ev.label}</div>
                <div style={{ fontSize: 11, color: C.text2 }}>{ev.sub}</div>
              </div>
              <input type="checkbox" defaultChecked={ev.email} style={{ width: 15, height: 15, cursor: "pointer", accentColor: C.guardian }} />
              <input type="checkbox" defaultChecked={ev.push}  style={{ width: 15, height: 15, cursor: "pointer", accentColor: C.guardian }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Security ──
function TabSecurity({ toast }: { toast: (m: string, t?: any) => void }) {
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Session & access</span></div>
        <div style={CARD_BODY}>
          <div style={FG}><label style={FL}>Session timeout</label><select style={FI}><option>30 minutes</option><option>4 hours</option><option>8 hours</option><option>24 hours</option><option>Never (admin only)</option></select><span style={FHINT}>Automatic logout after inactivity</span></div>
          <div style={FG}><label style={FL}>Login method</label><select style={FI}><option>Email OTP (6 digits)</option><option>Google Workspace SSO</option><option>Email OTP + SSO</option></select></div>
          <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>IP allowlist</label><textarea style={{ ...FI, minHeight: 72, resize: "vertical" }} placeholder={"One IP or CIDR per line\ne.g. 192.168.1.0/24\ne.g. 203.0.113.45"} /><span style={FHINT}>Leave empty to allow access from any IP</span></div>
        </div>
      </div>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Active sessions</span></div>
        <div style={CARD_BODY}>
          {[
            { icon: "💻", name: "Chrome · macOS · Milan, IT",   time: "Now",       current: true  },
            { icon: "📱", name: "Safari · iPhone · Milan, IT",  time: "2h ago",    current: false },
            { icon: "💻", name: "Firefox · Windows · Rome, IT", time: "Yesterday", current: false },
          ].map((s, i, arr) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{s.name}</div>
                <div style={{ fontSize: 11, color: s.current ? C.greenText : C.text2, fontWeight: s.current ? 600 : 400 }}>{s.current ? "✓ Current session" : `Last seen ${s.time}`}</div>
              </div>
              {!s.current && <button style={BTN("danger", { fontSize: 10, padding: "3px 8px" })} onClick={() => toast("Session terminated","ok")}>Terminate</button>}
              {s.current && <span style={{ fontSize: 10, color: C.text3 }}>Now</span>}
            </div>
          ))}
        </div>
      </div>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Audit & logs</span></div>
        <div style={CARD_BODY}>
          <div style={FG}><label style={FL}>Audit log retention</label><select style={FI}><option>30 days</option><option>90 days</option><option>1 year</option><option>Unlimited (Enterprise)</option></select></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={BTN("sm")} onClick={() => toast("Opening audit log…","ok")}>View audit log</button>
            <button style={BTN("sm")} onClick={() => toast("Exporting log CSV…","ok")}>Export CSV</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Appearance ──
function TabAppearance() {
  const [theme, setTheme] = useState<"light"|"dark"|"auto">("light");
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Theme</span></div>
        <div style={CARD_BODY}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { id: "light" as const, label: "☀ Light (active)", preview: { bg: "#F8F7F3", text: C.text2 } },
              { id: "dark"  as const, label: "🌙 Dark",            preview: { bg: "#1a1a2e",  text: "#aaa"  } },
              { id: "auto"  as const, label: "⚙ Auto",            preview: null },
            ].map(opt => (
              <div key={opt.id} onClick={() => setTheme(opt.id)} style={{ border: `${theme === opt.id ? 2 : 1}px solid ${theme === opt.id ? C.guardian : C.border}`, borderRadius: 10, padding: 12, cursor: "pointer", textAlign: "center" as const }}>
                {opt.preview
                  ? <div style={{ background: opt.preview.bg, borderRadius: 6, height: 40, marginBottom: 8, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: opt.preview.text }}>Aa</div>
                  : <div style={{ background: "linear-gradient(135deg,#F8F7F3 50%,#1a1a2e 50%)", borderRadius: 6, height: 40, marginBottom: 8, border: `1px solid ${C.border}` }} />
                }
                <div style={{ fontSize: 11, fontWeight: theme === opt.id ? 700 : 600, color: theme === opt.id ? C.guardian : C.text2 }}>{opt.label}</div>
              </div>
            ))}
          </div>
          <div style={FG}><label style={FL}>Interface density</label><select style={FI}><option>Comfortable (default)</option><option>Compact (more rows)</option><option>Spacious (focus mode)</option></select></div>
          <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>UI font</label><select style={FI}><option>DM Sans (default)</option><option>Inter</option><option>System (system-ui)</option></select></div>
        </div>
      </div>
      <div style={CARD}>
        <div style={CARD_H}><span style={CARD_T}>Dashboard customisation</span></div>
        <div style={CARD_BODY}>
          {[
            { label: "Show Guardian AI bar everywhere",   on: true  },
            { label: "Reduce animations",                 on: false },
            { label: "European number format (1.234,56)", on: true  },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{row.label}</span>
              <Toggle on={row.on} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab config ──
type Tab = "profile"|"org"|"guardian"|"notifications"|"security"|"appearance";
const TABS: { id: Tab; label: string }[] = [
  { id: "profile",       label: "Profile"       },
  { id: "org",           label: "Organisation"  },
  { id: "guardian",      label: "Guardian AI"   },
  { id: "notifications", label: "Notifications" },
  { id: "security",      label: "Security"      },
  { id: "appearance",    label: "Appearance"    },
];

// ── Main component ──
export default function SettingsMainClient() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saved, setSaved] = useState(false);
  const [showDeleteOrg, setShowDeleteOrg] = useState(false);
  const { show: toast, ToastContainer } = useToast();

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    toast("All changes saved","ok");
  };

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Settings</h1>
          <p style={{ fontSize: 12, color: C.text3, margin: 0 }}>Platform and account configuration</p>
        </div>
        <button onClick={handleSave} style={{
          ...BTN(saved ? "success" : "primary"),
          transition: ".2s",
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {saved ? "Saved" : "Save all"}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 1, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "8px 14px", border: "none", background: "none", cursor: "pointer",
            fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 500,
            color: activeTab === tab.id ? C.text : C.text2,
            borderBottom: `2px solid ${activeTab === tab.id ? C.text : "transparent"}`,
            marginBottom: -1, transition: ".12s", fontFamily: "inherit",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab panels ── */}
      {activeTab === "profile"       && <TabProfile       toast={toast} />}
      {activeTab === "org"           && <TabOrg           toast={toast} onDeleteOrg={() => setShowDeleteOrg(true)} />}
      {activeTab === "guardian"      && <TabGuardian      />}
      {activeTab === "notifications" && <TabNotifications />}
      {activeTab === "security"      && <TabSecurity      toast={toast} />}
      {activeTab === "appearance"    && <TabAppearance    />}

      <ModalDeleteOrg open={showDeleteOrg} onClose={() => { setShowDeleteOrg(false); toast("Action cancelled","warn"); }} />
      <ToastContainer />
    </div>
  );
}
