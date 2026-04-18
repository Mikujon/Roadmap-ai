"use client";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";

const TIMEZONES = [
  "UTC", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Rome",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
];
const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY", "AUD", "CAD", "SGD"];
const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];

interface OrgSettingsProps {
  orgName:        string;
  orgId:          string;
  brandColor?:    string | null;
  documentHeader?: string | null;
  documentFooter?: string | null;
}

export default function OrgSettingsClient({ orgName, orgId, brandColor: initBrand, documentHeader: initHeader, documentFooter: initFooter }: OrgSettingsProps) {
  const { toast } = useToast();
  const [name,           setName]    = useState(orgName);
  const [timezone,       setTimezone]= useState("UTC");
  const [currency,       setCurrency]= useState("EUR");
  const [dateFormat,     setDateFmt] = useState("DD/MM/YYYY");
  const [fiscalStart,    setFiscal]  = useState("January");
  const [brandColor,     setBrand]   = useState(initBrand ?? "#006D6B");
  const [documentHeader, setHeader]  = useState(initHeader ?? "");
  const [documentFooter, setFooter]  = useState(initFooter ?? "");
  const [saving, setSaving]          = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 13px", border: "1.5px solid #E5E2D9",
    borderRadius: 9, fontSize: 13, fontFamily: "inherit", outline: "none",
    color: "#18170F", boxSizing: "border-box",
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/org`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone, currency, dateFormat, fiscalStart, brandColor, documentHeader, documentFooter }),
      });
      if (!res.ok) throw new Error();
      toast("Organization settings saved", "success");
    } catch {
      toast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Profile card */}
      <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #F4F2EC", fontWeight: 700, fontSize: 14, color: "#18170F" }}>
          Organization Profile
        </div>
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#9E9C93", display: "block", marginBottom: 6 }}>Organization Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Your org name" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9E9C93", display: "block", marginBottom: 6 }}>Default Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9E9C93", display: "block", marginBottom: 6 }}>Date Format</label>
              <select value={dateFormat} onChange={e => setDateFmt(e.target.value)} style={inputStyle}>
                {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9E9C93", display: "block", marginBottom: 6 }}>Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} style={inputStyle}>
                {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9E9C93", display: "block", marginBottom: 6 }}>Fiscal Year Start</label>
              <select value={fiscalStart} onChange={e => setFiscal(e.target.value)} style={inputStyle}>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #F4F2EC", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={save} disabled={saving} style={{ padding: "9px 24px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 9, background: "#006D6B", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Document Branding */}
      <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #F4F2EC", fontWeight: 700, fontSize: 14, color: "#18170F" }}>
          Document Branding
        </div>
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#9E9C93", display: "block", marginBottom: 6 }}>Brand Color</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="color"
                value={brandColor}
                onChange={e => setBrand(e.target.value)}
                style={{ width: 48, height: 36, padding: 2, border: "1.5px solid #E5E2D9", borderRadius: 8, cursor: "pointer", background: "none" }}
              />
              <input
                value={brandColor}
                onChange={e => setBrand(e.target.value)}
                style={{ ...inputStyle, width: 120 }}
                placeholder="#006D6B"
              />
              <span style={{ fontSize: 11, color: "#9E9C93" }}>Used in document headers and exports</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#9E9C93", display: "block", marginBottom: 6 }}>Document Header Text</label>
            <input
              value={documentHeader}
              onChange={e => setHeader(e.target.value)}
              style={inputStyle}
              placeholder="e.g. Confidential — Acme Corp PMO"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#9E9C93", display: "block", marginBottom: 6 }}>Document Footer Text</label>
            <input
              value={documentFooter}
              onChange={e => setFooter(e.target.value)}
              style={inputStyle}
              placeholder="e.g. © 2025 Acme Corp. All rights reserved."
            />
          </div>
          {/* Preview */}
          <div style={{ border: "1px solid #E5E2D9", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ background: brandColor, padding: "8px 14px", fontSize: 11, fontWeight: 700, color: "#fff" }}>
              {documentHeader || "Document header preview"}
            </div>
            <div style={{ padding: "12px 14px", fontSize: 11, color: "#9E9C93", background: "#FAFAF8" }}>
              Document content area…
            </div>
            <div style={{ background: "#F4F2EC", padding: "6px 14px", fontSize: 10, color: "#9E9C93", borderTop: "1px solid #E5E2D9" }}>
              {documentFooter || "Document footer preview"}
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #F4F2EC", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={save} disabled={saving} style={{ padding: "9px 24px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 9, background: "#006D6B", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #FECACA", fontWeight: 700, fontSize: 14, color: "#DC2626" }}>
          Danger Zone
        </div>
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F" }}>Delete Organization</div>
              <div style={{ fontSize: 12, color: "#5C5A52", marginTop: 2 }}>Permanently remove this organization and all its data. This cannot be undone.</div>
            </div>
            <button
              onClick={() => { if (window.confirm("Are you sure? This will permanently delete the organization and all data.")) toast("Contact support to delete your organization.", "info"); }}
              style={{ padding: "8px 18px", fontSize: 12, fontWeight: 700, border: "1.5px solid #DC2626", borderRadius: 8, background: "#fff", color: "#DC2626", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
            >
              Delete Org
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
