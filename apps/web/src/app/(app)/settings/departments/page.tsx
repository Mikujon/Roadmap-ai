"use client";
import { useState, useEffect } from "react";

interface Department {
  id: string;
  name: string;
  color: string;
  description?: string;
}

const COLORS = ["#006D6B","#2563EB","#D97706","#DC2626","#7C3AED","#059669","#EA580C","#0891B2","#BE185D","#65A30D"];

export default function DepartmentsSettingsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [newName, setNewName]         = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [newColor, setNewColor]       = useState(COLORS[0]);
  const [error, setError]             = useState("");

  useEffect(() => {
    fetch("/api/departments")
      .then(r => r.json())
      .then(data => { setDepartments(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const create = async () => {
    if (!newName.trim()) { setError("Department name is required"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), color: newColor }),
    });
    if (res.ok) {
      const dept = await res.json();
      setDepartments(d => [...d, dept]);
      setNewName(""); setNewDesc(""); setNewColor(COLORS[0]);
    } else {
      const e = await res.json();
      setError(e.error ?? "Failed to create department");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this department? It will be removed from all projects.")) return;
    await fetch(`/api/departments/${id}`, { method: "DELETE" });
    setDepartments(d => d.filter(dep => dep.id !== id));
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>Departments</h2>
        <p style={{ fontSize: 13, color: "#64748B" }}>
          Create departments for your organization. Departments can be assigned to projects and used to group cost views.
        </p>
      </div>

      {/* Create new department */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>New Department</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Name *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Engineering, Marketing, Finance"
                style={{ width: "100%", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", color: "#0F172A" }}
                onKeyDown={e => e.key === "Enter" && create()}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Description</label>
              <input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Optional description"
                style={{ width: "100%", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", color: "#0F172A" }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Color</label>
            <div style={{ display: "flex", gap: 8 }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setNewColor(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer", border: newColor === c ? "3px solid #0F172A" : "3px solid transparent", flexShrink: 0 }} />
              ))}
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 500 }}>{error}</div>}
          <button
            onClick={create}
            disabled={saving}
            style={{ alignSelf: "flex-start", padding: "10px 20px", background: "#006D6B", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Creating…" : "+ Create Department"}
          </button>
        </div>
      </div>

      {/* Existing departments */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Organization Departments</div>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>{departments.length} total</span>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>Loading…</div>
        ) : departments.length === 0 ? (
          <div style={{ padding: "40px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 6 }}>No departments yet</div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>Create your first department above</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {departments.map((dept, i) => (
              <div key={dept.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: i < departments.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: dept.color + "20", border: `2px solid ${dept.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: dept.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{dept.name}</div>
                  {dept.description && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{dept.description}</div>}
                </div>
                <button
                  onClick={() => remove(dept.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontSize: 12, padding: "4px 8px", borderRadius: 6, fontFamily: "inherit" }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 20, padding: "14px 18px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 12, color: "#64748B" }}>
        💡 Departments can be assigned to projects in the project Settings drawer. They appear in the Portfolio and Cost View for filtering and grouping.
      </div>
    </div>
  );
}