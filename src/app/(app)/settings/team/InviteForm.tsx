"use client";
import { useState } from "react";

export default function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const invite = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed to invite");
      else {
        setSuccess(`Invitation sent to ${email}`);
        setEmail("");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#E2EBF6", marginBottom: 12 }}>Invite Member</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ flex: 1, background: "#0A1628", border: "1px solid #1E3A5F", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#E2EBF6", outline: "none" }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ background: "#0A1628", border: "1px solid #1E3A5F", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#E2EBF6", outline: "none" }}
        >
          <option value="MEMBER">Member</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button
          onClick={invite}
          disabled={loading || !email}
          style={{ background: "linear-gradient(135deg,#007A73,#0a9a90)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loading || !email ? 0.5 : 1 }}
        >
          {loading ? "Sending..." : "Invite"}
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</p>}
      {success && <p style={{ fontSize: 12, color: "#007A73", marginTop: 8 }}>{success}</p>}
    </div>
  );
}