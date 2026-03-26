"use client";
import { useState, useEffect } from "react";

interface Risk { id: string; title: string; description?: string; probability: number; impact: number; status: string; mitigation?: string; }
interface Assignment { id: string; estimatedHours: number; actualHours: number; resource: { id: string; name: string; role: string; costPerHour: number; capacityHours: number; }; }
interface OrgResource { id: string; name: string; role: string; costPerHour: number; capacityHours: number; }

export default function GovernanceView({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [orgResources, setOrgResources] = useState<OrgResource[]>([]);
  const [activeTab, setActiveTab] = useState<"risks" | "resources">("risks");
  const [newRisk, setNewRisk] = useState({ title: "", probability: 3, impact: 3, description: "", mitigation: "" });
  const [addingRisk, setAddingRisk] = useState(false);
  const [savingRisk, setSavingRisk] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/risks`).then(r => r.json()).then(setRisks);
    fetch(`/api/projects/${projectId}/resources`).then(r => r.json()).then(setAssignments);
    fetch(`/api/resources`).then(r => r.json()).then(setOrgResources);
  }, [projectId]);

  const addRisk = async () => {
    if (!newRisk.title) return;
    setSavingRisk(true);
    const res = await fetch(`/api/projects/${projectId}/risks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRisk),
    });
    const r = await res.json();
    setRisks(p => [...p, r]);
    setNewRisk({ title: "", probability: 3, impact: 3, description: "", mitigation: "" });
    setAddingRisk(false);
    setSavingRisk(false);
  };

  const addResource = async (resourceId: string) => {
    const res = await fetch(`/api/projects/${projectId}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId, estimatedHours: 0, actualHours: 0 }),
    });
    const a = await res.json();
    setAssignments(p => [...p.filter(x => x.resource.id !== resourceId), a]);
  };

  const RISK_COLOR = (score: number) => score >= 15 ? "#EF4444" : score >= 8 ? "#F97316" : score >= 4 ? "#EAB308" : "#22C55E";
  const RISK_LABEL = (score: number) => score >= 15 ? "CRITICAL" : score >= 8 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 2, background: "#0F1827", borderRadius: 8, padding: 3, width: "fit-content" }}>
        {(["risks", "resources"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: activeTab === t ? "#1E3A5F" : "transparent", color: activeTab === t ? "#E2EBF6" : "#64748B", border: "none", cursor: "pointer" }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "risks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #1A2E44", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#E2EBF6" }}>Risk Register</span>
              {canEdit && <button onClick={() => setAddingRisk(true)} style={{ fontSize: 11, color: "#007A73", background: "rgba(0,122,115,0.1)", border: "1px solid rgba(0,122,115,0.3)", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>+ Add Risk</button>}
            </div>
            {addingRisk && (
              <div style={{ padding: "16px 18px", borderBottom: "1px solid #1A2E44", background: "#060E18", display: "flex", flexDirection: "column", gap: 10 }}>
                <input value={newRisk.title} onChange={e => setNewRisk(p => ({ ...p, title: e.target.value }))} placeholder="Risk title…" style={{ background: "#0A1220", color: "#E2EBF6", border: "1px solid #1E3A5F", borderRadius: 6, padding: "7px 12px", fontSize: 12, outline: "none" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, color: "#64748B" }}>Probability (1-5)</label>
                    <input type="number" min={1} max={5} value={newRisk.probability} onChange={e => setNewRisk(p => ({ ...p, probability: parseInt(e.target.value) }))} style={{ width: "100%", background: "#0A1220", color: "#E2EBF6", border: "1px solid #1E3A5F", borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none", marginTop: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: "#64748B" }}>Impact (1-5)</label>
                    <input type="number" min={1} max={5} value={newRisk.impact} onChange={e => setNewRisk(p => ({ ...p, impact: parseInt(e.target.value) }))} style={{ width: "100%", background: "#0A1220", color: "#E2EBF6", border: "1px solid #1E3A5F", borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none", marginTop: 4 }} />
                  </div>
                </div>
                <textarea value={newRisk.mitigation} onChange={e => setNewRisk(p => ({ ...p, mitigation: e.target.value }))} placeholder="Mitigation plan…" rows={2} style={{ background: "#0A1220", color: "#E2EBF6", border: "1px solid #1E3A5F", borderRadius: 6, padding: "7px 12px", fontSize: 12, outline: "none", resize: "vertical" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addRisk} disabled={savingRisk || !newRisk.title} style={{ padding: "7px 18px", background: "linear-gradient(135deg,#007A73,#0a9a90)", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{savingRisk ? "Saving…" : "Add Risk"}</button>
                  <button onClick={() => setAddingRisk(false)} style={{ padding: "7px 14px", background: "#1E3A5F", color: "#E2EBF6", border: "none", borderRadius: 7, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
            {risks.length === 0 ? (
              <div style={{ padding: "24px", fontSize: 12, color: "#475569", textAlign: "center", fontStyle: "italic" }}>No risks registered yet.</div>
            ) : (
              <div style={{ padding: "8px 0" }}>
                {risks.map(r => {
                  const score = r.probability * r.impact;
                  const c = RISK_COLOR(score);
                  return (
                    <div key={r.id} style={{ padding: "12px 18px", borderBottom: "1px solid #0F1827", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: c + "18", border: `1px solid ${c}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: c, fontFamily: "monospace" }}>{score}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</span>
                          <span style={{ fontSize: 9, color: c, background: c + "18", padding: "1px 7px", borderRadius: 4, fontWeight: 700 }}>{RISK_LABEL(score)}</span>
                          <span style={{ fontSize: 9, color: "#475569" }}>P:{r.probability} × I:{r.impact}</span>
                        </div>
                        {r.mitigation && <div style={{ fontSize: 11, color: "#64748B" }}>→ {r.mitigation}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {risks.length > 0 && (
            <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "18px 22px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#E2EBF6", marginBottom: 12 }}>RISK SUMMARY</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(level => {
                  const count = risks.filter(r => RISK_LABEL(r.probability * r.impact) === level).length;
                  const c = level === "CRITICAL" ? "#EF4444" : level === "HIGH" ? "#F97316" : level === "MEDIUM" ? "#EAB308" : "#22C55E";
                  return (
                    <div key={level} style={{ background: "#0A1220", border: `1px solid ${c}30`, borderRadius: 8, padding: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: c, fontFamily: "monospace" }}>{count}</div>
                      <div style={{ fontSize: 10, color: "#64748B", marginTop: 4 }}>{level}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "resources" && (
        <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #1A2E44", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#E2EBF6" }}>Resource Assignments</span>
            {canEdit && orgResources.length > 0 && (
              <select onChange={e => { if (e.target.value) { addResource(e.target.value); e.target.value = ""; } }} style={{ background: "#0F1827", color: "#E2EBF6", border: "1px solid #1E3A5F", borderRadius: 6, padding: "4px 10px", fontSize: 11, outline: "none" }}>
                <option value="">+ Assign resource…</option>
                {orgResources.filter(r => !assignments.some(a => a.resource.id === r.id)).map(r => (
                  <option key={r.id} value={r.id}>{r.name} — {r.role}</option>
                ))}
              </select>
            )}
          </div>
          {assignments.length === 0 ? (
            <div style={{ padding: "24px", fontSize: 12, color: "#475569", textAlign: "center", fontStyle: "italic" }}>No resources assigned. First create resources in Settings → Team, then assign them here.</div>
          ) : (
            <div style={{ padding: "8px 0" }}>
              {assignments.map(a => {
                const util = a.resource.capacityHours > 0 ? (a.actualHours / a.resource.capacityHours) * 100 : 0;
                const utilColor = util > 120 ? "#EF4444" : util > 100 ? "#F97316" : util > 80 ? "#EAB308" : "#00C97A";
                const cost = a.actualHours * a.resource.costPerHour;
                return (
                  <div key={a.id} style={{ padding: "12px 18px", borderBottom: "1px solid #0F1827" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{a.resource.name}</span>
                        <span style={{ fontSize: 11, color: "#64748B", marginLeft: 8 }}>{a.resource.role}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: "#E2EBF6", fontFamily: "monospace" }}>€{cost.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: "#64748B" }}>€{a.resource.costPerHour}/hr</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, height: 5, background: "#1E3A5F", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: Math.min(util, 100) + "%", background: utilColor, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 10, color: utilColor, fontFamily: "monospace", minWidth: 50 }}>{Math.round(util)}% util</span>
                      <span style={{ fontSize: 10, color: "#475569" }}>{a.actualHours}h / {a.resource.capacityHours}h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}