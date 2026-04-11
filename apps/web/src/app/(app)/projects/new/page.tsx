"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    functionalAnalysis: "",
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  const LABELS = [
    "Analyzing requirements…",
    "Defining phases…",
    "Breaking down sprints…",
    "Assigning priorities…",
    "Finalizing roadmap…",
  ];

  async function submit() {
    if (!form.name || !form.functionalAnalysis || !form.startDate || !form.endDate) return;
    setLoading(true);
    setError("");
    let i = 0;
    setLabel(LABELS[0]);
    const t = setInterval(() => {
      i = (i + 1) % LABELS.length;
      setLabel(LABELS[i]);
    }, 2000);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/projects/${data.projectId}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    } finally {
      clearInterval(t);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%",
    background: "#0F1827",
    color: "#E2EBF6",
    border: "1px solid #1E3A5F",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    outline: "none",
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, background: "#080E1A" }}>
      <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,#007A73,#3B82F6)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff" }}>RM</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#E2EBF6" }}>{label}</div>
      <div style={{ fontSize: 12, color: "#64748B" }}>Claude AI is designing your roadmap…</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#E2EBF6" }}>New Project</h2>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 32 }}>
        Describe your project and Claude AI will generate a full roadmap.
      </p>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #EF4444", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#EF4444" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#C8D8E8", marginBottom: 6 }}>Project Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Project" style={inp} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#C8D8E8", marginBottom: 6 }}>Start Date *</label>
            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#C8D8E8", marginBottom: 6 }}>End Date *</label>
            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={inp} />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#C8D8E8", marginBottom: 6 }}>Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="What is this project?" />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#C8D8E8", marginBottom: 6 }}>Functional Analysis / Requirements *</label>
          <p style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>List all modules, features, integrations. The more detail, the better the roadmap.</p>
          <textarea
            value={form.functionalAnalysis}
            onChange={e => setForm(f => ({ ...f, functionalAnalysis: e.target.value }))}
            rows={12}
            style={{ ...inp, resize: "vertical", lineHeight: 1.7 }}
            placeholder={"• User authentication\n• Admin dashboard\n• REST API with Node.js\n• PostgreSQL database\n• Stripe payments\n• Mobile app (React Native)"}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{ padding: "10px 22px", background: "#0F1827", color: "#64748B", border: "1px solid #1E3A5F", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!form.name || !form.functionalAnalysis || !form.startDate || !form.endDate}
            style={{ padding: "10px 28px", background: "linear-gradient(135deg,#007A73,#0a9a90)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (!form.name || !form.functionalAnalysis) ? 0.4 : 1 }}
          >
            ✦ Generate with AI
          </button>
        </div>
      </div>
    </div>
  );
}