"use client";
import { useState } from "react";

interface InviteResult {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

interface Props {
  onSuccess?: (inv: InviteResult) => void;
  onError?:   (msg: string) => void;
}

export default function InviteForm({ onSuccess, onError }: Props) {
  const [email,   setEmail]   = useState("");
  const [role,    setRole]    = useState("PMO");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const invite = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res  = await fetch("/api/invitations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? "Failed to send invitation";
        setError(msg);
        onError?.(msg);
      } else {
        setSuccess(`Invitation sent to ${email}`);
        setEmail("");
        onSuccess?.(data.invitation);
      }
    } catch {
      const msg = "Something went wrong";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, padding: "18px 20px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F", marginBottom: 14 }}>Invite Member</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && email && invite()}
          style={{
            flex: 1, background: "#F8FAFC", border: "1.5px solid #E5E2D9",
            borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#18170F",
            outline: "none", fontFamily: "inherit",
          }}
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          style={{
            background: "#F8FAFC", border: "1.5px solid #E5E2D9",
            borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#18170F",
            outline: "none", fontFamily: "inherit", cursor: "pointer",
          }}
        >
          <option value="PMO">PMO — Project Manager</option>
          <option value="CEO">CEO — Executive view</option>
          <option value="STAKEHOLDER">Stakeholder — Client/Sponsor</option>
          <option value="DEV">Dev — Developer/Designer</option>
          <option value="ADMIN">Admin — Full access + billing</option>
        </select>
        <button
          onClick={invite}
          disabled={loading || !email}
          style={{
            background: "#006D6B", color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600,
            cursor: loading || !email ? "not-allowed" : "pointer",
            opacity: loading || !email ? 0.5 : 1, fontFamily: "inherit",
          }}
        >
          {loading ? "Sending…" : "Invite"}
        </button>
      </div>
      {error   && <p style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>{error}</p>}
      {success && <p style={{ fontSize: 12, color: "#059669", marginTop: 8 }}>{success}</p>}
    </div>
  );
}
