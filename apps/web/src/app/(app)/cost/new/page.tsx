"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COLORS = [
  "#006D6B", "#2563EB", "#7C3AED", "#EA580C",
  "#DC2626", "#059669", "#D97706", "#DB2777",
];

export default function NewDepartmentPage() {
  const router = useRouter();
  const [name, setName]       = useState("");
  const [budget, setBudget]   = useState("");
  const [color, setColor]     = useState("#006D6B");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit() {
    if (!name.trim()) { setError("Name is required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), budget: budget ? parseFloat(budget) : 0, color }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Something went wrong"); return; }
      router.push("/departments");
      router.refresh();
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .field-input { width: 100%; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 11px 14px; color: #0F172A; font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; transition: border 0.15s; }
        .field-input:focus { border-color: #006D6B; background: #fff; }
        .color-dot { width: 34px; height: 34px; border-radius: 50%; cursor: pointer; border: 3px solid transparent; transition: all 0.15s; }
        .color-dot.selected { border-color: #0F172A; transform: scale(1.12); }
        .btn-primary { padding: 11px 24px; background: #006D6B; color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: background 0.15s; }
        .btn-primary:hover:not(:disabled) { background: #005a58; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { padding: 11px 20px; background: #F8FAFC; color: #64748B; border: 1.5px solid #E2E8F0; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; text-decoration: none; display: inline-flex; align-items: center; }
        .btn-secondary:hover { background: #F1F5F9; }
      `}</style>

      <div style={{ padding: "28px 32px", maxWidth: 560, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link href="/departments" style={{ fontSize: 12, color: "#94A3B8", textDecoration: "none", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
            ← Back to Departments
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.5px", marginBottom: 4 }}>New Department</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>Create a department to group resources and track costs</p>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Department Name <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              className="field-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Engineering, Marketing, Finance"
            />
          </div>

          {/* Budget */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Budget (USD) <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>— optional</span>
            </label>
            <input
              className="field-input"
              type="number"
              min="0"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="e.g. 50000"
            />
          </div>

          {/* Color */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 12 }}>Color</label>
            <div style={{ display: "flex", gap: 10 }}>
              {COLORS.map(c => (
                <div key={c} className={`color-dot${color === c ? " selected" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: name ? "#0F172A" : "#CBD5E1" }}>{name || "Department name"}</span>
            {budget && <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748B" }}>${parseFloat(budget).toLocaleString()}</span>}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#DC2626", fontWeight: 500 }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Link href="/departments" className="btn-secondary">Cancel</Link>
            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating…" : "Create Department"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}