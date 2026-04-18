// ─────────────────────────────────────────────
// SHARED DESIGN TOKENS & UTILITIES
// src/components/ui/shared.tsx
// ─────────────────────────────────────────────
"use client";
import { useState, useEffect, useCallback } from "react";

// ── Color tokens (match globals.css CSS vars) ──
export const C = {
  bg:       "#F8F7F3",
  bg2:      "#F0EEE8",
  surface:  "#FFFFFF",
  surface2: "#F4F2EC",
  surface3: "#ECEAE3",
  border:   "#E5E2D9",
  border2:  "#CCC9BF",
  text:     "#18170F",
  text2:    "#5C5A52",
  text3:    "#9E9C93",
  guardian: "#006D6B",
  guardianLight: "#EDFAF9",
  guardianBorder: "#7FD4CF",
  red:      "#DC2626", redBg: "#FEF2F2", redBorder: "#FECACA", redText: "#991B1B",
  amber:    "#D97706", amberBg: "#FFFBEB", amberBorder: "#FDE68A", amberText: "#92400E",
  green:    "#059669", greenBg: "#ECFDF5", greenBorder: "#A7F3D0", greenText: "#065F46",
  blue:     "#2563EB", blueBg: "#EFF6FF", blueBorder: "#BFDBFE", blueText: "#1E3A8A",
  purple:   "#7C3AED", purpleBg: "#F5F3FF", purpleBorder: "#DDD6FE", purpleText: "#4C1D95",
  teal:     "#0D9488", tealBg: "#F0FDFA", tealBorder: "#99F6E4", tealText: "#134E4A",
} as const;

// ── Shared style objects ──
export const FG: React.CSSProperties = { marginBottom: 14 };
export const FL: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 5, letterSpacing: "-.1px" };
export const FI: React.CSSProperties = { width: "100%", padding: "8px 11px", border: `1px solid ${C.border2}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none", transition: ".15s", letterSpacing: "-.1px" };
export const FHINT: React.CSSProperties = { fontSize: 10, color: C.text3, marginTop: 4, lineHeight: 1.4 };
export const FROW: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
export const FROW3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };

export const CARD: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.07)" };
export const CARD_H: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${C.border}` };
export const CARD_T: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: "-.2px" };
export const CARD_S: React.CSSProperties = { fontSize: 10, color: C.text3 };
export const CARD_BODY: React.CSSProperties = { padding: 14 };

// Page header
export const PH: React.CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14 };
export const PT: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", lineHeight: 1.2, margin: 0 };
export const PS: React.CSSProperties = { fontSize: 11, color: C.text2, marginTop: 4, lineHeight: 1.4 };
export const PH_R: React.CSSProperties = { display: "flex", gap: 7, flexShrink: 0, alignItems: "center", flexWrap: "wrap" as const };

// Grids
export const G2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 };
export const G3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 };
export const G4: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 };

// ── Buttons ──
export const BTN = (variant: "default"|"primary"|"danger"|"success"|"warn"|"purple"|"sm"|"lg" = "default", extra?: React.CSSProperties): React.CSSProperties => {
  const base: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "6px 12px", border: `1px solid ${C.border2}`, borderRadius: 7, background: C.surface, color: C.text2, cursor: "pointer", transition: ".12s", whiteSpace: "nowrap" as const, fontFamily: "inherit", letterSpacing: "-.1px" };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: C.text, color: "#fff", borderColor: C.text },
    danger:  { background: C.redBg, color: C.redText, borderColor: C.redBorder },
    success: { background: C.greenBg, color: C.greenText, borderColor: C.greenBorder },
    warn:    { background: C.amberBg, color: C.amberText, borderColor: C.amberBorder },
    purple:  { background: C.purpleBg, color: C.purpleText, borderColor: C.purpleBorder },
    sm:      { fontSize: 10, padding: "4px 9px" },
    lg:      { fontSize: 12, padding: "8px 16px" },
  };
  return { ...base, ...(variants[variant] ?? {}), ...extra };
};

// ── Tags ──
type TagVariant = "r"|"a"|"g"|"b"|"p"|"t"|"n";
const TAG_STYLES: Record<TagVariant, React.CSSProperties> = {
  r: { background: C.redBg,    color: C.redText,    borderColor: C.redBorder    },
  a: { background: C.amberBg,  color: C.amberText,  borderColor: C.amberBorder  },
  g: { background: C.greenBg,  color: C.greenText,  borderColor: C.greenBorder  },
  b: { background: C.blueBg,   color: C.blueText,   borderColor: C.blueBorder   },
  p: { background: C.purpleBg, color: C.purpleText, borderColor: C.purpleBorder },
  t: { background: C.tealBg,   color: C.tealText,   borderColor: C.tealBorder   },
  n: { background: C.surface2, color: C.text2,      borderColor: C.border       },
};
export function Tag({ v, pill, children, style }: { v: TagVariant; pill?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: pill ? 20 : 5, border: "1px solid", whiteSpace: "nowrap" as const, flexShrink: 0, ...TAG_STYLES[v], ...style }}>
      {children}
    </span>
  );
}

// ── Dot status ──
type DotColor = "r"|"a"|"g"|"b"|"gr"|"p";
const DOT_COLORS: Record<DotColor, string> = { r: C.red, a: C.amber, g: C.green, b: C.blue, gr: C.text3, p: C.purple };
export function Dot({ c, size = 8 }: { c: DotColor; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: DOT_COLORS[c], flexShrink: 0, display: "inline-block" }} />;
}

// ── Progress bar ──
export function ProgBar({ pct, color }: { pct: number; color?: string }) {
  const col = color ?? (pct >= 70 ? C.green : pct >= 40 ? C.blue : C.red);
  return (
    <div style={{ height: 5, background: C.surface2, borderRadius: 3, overflow: "hidden", marginTop: 3 }}>
      <div style={{ height: "100%", width: `${Math.min(pct,100)}%`, background: col, borderRadius: 3 }} />
    </div>
  );
}

// ── KPI Card ──
type KpiVariant = "default"|"danger"|"warn"|"ok"|"info"|"purple";
const KPI_STYLES: Record<KpiVariant, { bg: string; border: string; valColor: string }> = {
  default: { bg: C.surface,   border: C.border,       valColor: C.text       },
  danger:  { bg: C.redBg,     border: C.redBorder,    valColor: C.redText    },
  warn:    { bg: C.amberBg,   border: C.amberBorder,  valColor: C.amberText  },
  ok:      { bg: C.greenBg,   border: C.greenBorder,  valColor: C.greenText  },
  info:    { bg: C.blueBg,    border: C.blueBorder,   valColor: C.blueText   },
  purple:  { bg: C.purpleBg,  border: C.purpleBorder, valColor: C.purpleText },
};
export function KpiCard({ label, value, sub, variant, accent, onClick }: { label: string; value: string|number; sub?: string; variant: KpiVariant; accent?: string; onClick?: () => void }) {
  const s = KPI_STYLES[variant];
  return (
    <div className="kpi-card" onClick={onClick} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: "14px 16px", position: "relative", overflow: "hidden", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, letterSpacing: "-.6px", color: s.valColor, fontFamily: "'DM Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, marginTop: 4, color: s.valColor, opacity: .75 }}>{sub}</div>}
      {accent && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 32, opacity: .1, pointerEvents: "none" }}>{accent}</div>}
    </div>
  );
}

// ── Guardian bar ──
export function GuardianBar({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: `linear-gradient(to right, rgba(0,109,107,.05), transparent)`, borderTop: `1px solid ${C.guardianBorder}` }}>
      <div className="g-dot-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: C.guardian, flexShrink: 0 }} />
      <p style={{ fontSize: 11, color: C.text2, flex: 1, lineHeight: 1.4, margin: 0 }}>
        <strong style={{ color: C.guardian }}>Guardian AI</strong> — {text}
      </p>
      {action && onAction && (
        <button onClick={onAction} style={BTN("sm")}>{action}</button>
      )}
    </div>
  );
}

// ── Decision feed item ──
type DecPriority = "urgent"|"watch"|"good"|"info";
const DEC_CFG: Record<DecPriority, { dot: string; badge: string; badgeBg: string; bg: string; borderLeft: string }> = {
  urgent: { dot: C.red,    badge: "URGENT", badgeBg: C.red,    bg: "rgba(220,38,38,.05)",  borderLeft: C.red    },
  watch:  { dot: C.amber,  badge: "WATCH",  badgeBg: C.amber,  bg: "rgba(217,119,6,.04)",  borderLeft: C.amber  },
  good:   { dot: C.green,  badge: "GOOD",   badgeBg: C.green,  bg: "rgba(5,150,105,.04)",  borderLeft: C.green  },
  info:   { dot: C.blue,   badge: "INFO",   badgeBg: C.blue,   bg: "rgba(37,99,235,.04)",  borderLeft: C.blue   },
};
export function DecItem({ priority, text, meta, actions }: { priority: DecPriority; text: string; meta?: string; actions?: React.ReactNode }) {
  const cfg = DEC_CFG[priority];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${C.border}`, background: cfg.bg, borderLeft: `3px solid ${cfg.borderLeft}`, paddingLeft: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, paddingTop: 2 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot }} />
        <span style={{ fontSize: 8, fontWeight: 800, color: "#fff", background: cfg.badgeBg, borderRadius: 4, padding: "2px 6px", letterSpacing: ".06em", whiteSpace: "nowrap" as const }}>{cfg.badge}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.text, lineHeight: 1.4 }}>{text}</div>
        {meta && <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{meta}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "flex-start", marginTop: 1 }}>{actions}</div>}
    </div>
  );
}

// ── Modal ──
export function Modal({ id, title, open, onClose, wide, xl, children, footer }: {
  id: string; title: string; open: boolean; onClose: () => void;
  wide?: boolean; xl?: boolean; children: React.ReactNode; footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;
  const w = xl ? 820 : wide ? 680 : 540;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: C.surface, borderRadius: 16, width: w, maxWidth: "calc(100vw - 32px)", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,.16)", animation: "modalEnter .2s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.3px", color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: C.text2, fontSize: 14 }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
        {footer && (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 20px", borderTop: `1px solid ${C.border}` }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Row ──
export function Row({ children, onClick, highlight }: { children: React.ReactNode; onClick?: () => void; highlight?: "r"|"a"|"g" }) {
  const bg = highlight === "r" ? "rgba(220,38,38,.04)" : highlight === "a" ? "rgba(217,119,6,.04)" : highlight === "g" ? "rgba(5,150,105,.04)" : undefined;
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", borderBottom: `1px solid ${C.border}`, cursor: onClick ? "pointer" : "default", background: bg, transition: "background .1s" }}>
      {children}
    </div>
  );
}

// ── Risk score box ──
type RiskLevel = "crit"|"high"|"med"|"low";
const RISK_STYLES: Record<RiskLevel, { bg: string; color: string; border: string }> = {
  crit: { bg: C.redBg,   color: C.redText,   border: C.redBorder   },
  high: { bg: C.amberBg, color: C.amberText, border: C.amberBorder },
  med:  { bg: C.blueBg,  color: C.blueText,  border: C.blueBorder  },
  low:  { bg: C.greenBg, color: C.greenText, border: C.greenBorder },
};
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 15) return "crit";
  if (score >= 10) return "high";
  if (score >= 5)  return "med";
  return "low";
}
export function RiskScore({ score }: { score: number }) {
  const level = getRiskLevel(score);
  const s = RISK_STYLES[level];
  return (
    <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0, fontFamily: "'DM Mono', monospace", background: s.bg, color: s.color, border: `1.5px solid ${s.border}` }}>
      {score}
    </div>
  );
}

// ── EVM metric row ──
export function EvmRow({ label, abbr, value, status }: { label: string; abbr: string; value: string; status?: "ok"|"warn"|"bad"|"neutral" }) {
  const colors = { ok: C.greenText, warn: C.amberText, bad: C.redText, neutral: C.text };
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "8px 14px", borderBottom: `1px solid ${C.border}`, gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 500, flex: 1, color: C.text }}>
        {label} <span style={{ fontSize: 10, color: C.text3, fontFamily: "'DM Mono', monospace" }}>{abbr}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-.3px", fontFamily: "'DM Mono', monospace", color: colors[status ?? "neutral"] }}>{value}</div>
    </div>
  );
}

// ── Breadcrumb ──
export function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.text3, marginBottom: 16 }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {i > 0 && <span style={{ fontSize: 10 }}>›</span>}
          {item.onClick ? (
            <a onClick={item.onClick} style={{ color: C.text2, cursor: "pointer", textDecoration: "none" }}>{item.label}</a>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ── Chip filter ──
export function ChipGroup({ chips, active, onChange }: { chips: string[]; active: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 14 }}>
      {chips.map(chip => (
        <button key={chip} onClick={() => onChange(chip)} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: active === chip ? C.text : C.surface2,
          border: `1px solid ${active === chip ? C.text : C.border}`,
          borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 500,
          color: active === chip ? "#fff" : C.text2, cursor: "pointer",
          fontFamily: "inherit", transition: ".1s",
        }}>
          {chip}
        </button>
      ))}
    </div>
  );
}

// ── Sync bar ──
export function SyncBar({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 12, marginBottom: 14 }}>
      <div className="g-dot-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: C.guardian, flexShrink: 0 }} />
      <div style={{ fontSize: 11, color: C.greenText, flex: 1, fontWeight: 500 }}>{text}</div>
      {action && onAction && <button onClick={onAction} style={BTN("sm")}>{action}</button>}
    </div>
  );
}

// ── Member row ──
export function MemberRow({ initials, avatarBg, avatarColor, name, sub, children }: { initials: string; avatarBg: string; avatarColor: string; name: string; sub: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{name}</div>
        <div style={{ fontSize: 10, color: C.text3 }}>{sub}</div>
      </div>
      {children}
    </div>
  );
}

// ── Toast (global) ──
export function useToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "ok"|"err"|"warn" }[]>([]);
  const show = useCallback((msg: string, type: "ok"|"err"|"warn" = "ok") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);
  const ToastContainer = () => (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "ok" ? C.guardian : t.type === "err" ? C.red : C.amberText,
          color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 500,
          boxShadow: "0 12px 40px rgba(0,0,0,.12)", display: "flex", alignItems: "center", gap: 9, maxWidth: 320,
          animation: "slideIn .3s cubic-bezier(.34,1.56,.64,1)",
        }}>
          {t.type === "ok" ? "✓" : t.type === "err" ? "✕" : "⚠"} {t.msg}
        </div>
      ))}
    </div>
  );
  return { show, ToastContainer };
}

// ── Inline source badge (Jira/Native) ──
export function SrcBadge({ type }: { type: "jira"|"native" }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
      background: type === "jira" ? C.blueBg : C.purpleBg,
      color: type === "jira" ? C.blueText : C.purpleText,
    }}>
      {type === "jira" ? "Jira" : "Native"}
    </span>
  );
}
