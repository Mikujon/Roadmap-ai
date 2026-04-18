"use client";
import { useState } from "react";
import { C, CARD, CARD_H, CARD_T, CARD_S, G2, BTN, Tag, Row, MemberRow, useToast } from "@/components/ui/shared";
import { ModalInvite, ModalEditRole } from "@/components/ui/project-modals";
import { Breadcrumb } from "@/components/ui/breadcrumb";

type Role = "ADMIN" | "MANAGER" | "VIEWER";

interface MemberData {
  id: string; userId: string; name: string | null;
  email: string; role: Role; joinedAt: string; isMe: boolean;
}
interface InvitationData {
  id: string; email: string; role: Role; expiresAt: string;
}
interface Props {
  orgName: string;
  members: MemberData[];
  invitations: InvitationData[];
}

const ROLE_TAG: Record<Role, { v: "g"|"b"|"n"; label: string }> = {
  ADMIN:   { v: "g", label: "Admin"   },
  MANAGER: { v: "b", label: "Manager" },
  VIEWER:  { v: "n", label: "Viewer"  },
};

const MEMBER_COLORS = [
  { bg: "#111111",  color: "#fff"      },
  { bg: "#EFF6FF",  color: "#1E3A8A"  },
  { bg: "#F0FDFA",  color: "#134E4A"  },
  { bg: "#F5F3FF",  color: "#4C1D95"  },
  { bg: "#ECFDF5",  color: "#065F46"  },
];

function initials(name: string | null, email: string) {
  const n = name ?? email;
  return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function fmtExpiry(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function TeamPageClient({ orgName, members, invitations }: Props) {
  const [showInvite,    setShowInvite]    = useState(false);
  const [showEditRole,  setShowEditRole]  = useState(false);
  const [localMembers,  setLocalMembers]  = useState(members);
  const [localInvites,  setLocalInvites]  = useState(invitations);
  const { show: toast, ToastContainer }   = useToast();

  const removeMember = async (id: string) => {
    if (!confirm("Remove this member?")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    setLocalMembers(p => p.filter(m => m.id !== id));
    toast("Member removed", "ok");
  };

  const cancelInvite = async (id: string) => {
    await fetch(`/api/invitations/${id}`, { method: "DELETE" });
    setLocalInvites(p => p.filter(i => i.id !== id));
    toast("Invitation cancelled", "ok");
  };

  const resendInvite = async (id: string) => {
    await fetch(`/api/invitations/${id}/resend`, { method: "POST" });
    toast("Invitation resent", "ok");
  };

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Breadcrumb items={[{ label: "Settings", href: "/settings" }, { label: "Team" }]} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Team</h1>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>Members · roles · invitations · {orgName}</p>
        </div>
        <button style={BTN("primary", { fontSize: 10, padding: "4px 9px" })} onClick={() => setShowInvite(true)}>+ Invite member</button>
      </div>

      <div style={G2}>
        <div style={CARD}>
          <div style={CARD_H}>
            <span style={CARD_T}>Members</span>
            <span style={CARD_S}>{localMembers.length} active</span>
          </div>
          {localMembers.map((m, i) => {
            const col = MEMBER_COLORS[i % MEMBER_COLORS.length];
            const tag = ROLE_TAG[m.role];
            return (
              <MemberRow
                key={m.id}
                initials={initials(m.name, m.email)}
                avatarBg={col.bg}
                avatarColor={col.color}
                name={m.name ?? m.email}
                sub={`${m.email} · ${m.role.charAt(0) + m.role.slice(1).toLowerCase()} · ${new Date(m.joinedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`}
              >
                <Tag v={tag.v}>{tag.label}</Tag>
                {!m.isMe && (
                  <>
                    <button style={{ ...BTN("sm"), marginLeft: 8 }} onClick={() => setShowEditRole(true)}>Edit</button>
                    <button style={{ ...BTN("danger", { fontSize: 10, padding: "3px 8px" }), marginLeft: 4 }} onClick={() => removeMember(m.id)}>Remove</button>
                  </>
                )}
                {m.isMe && <span style={{ fontSize: 10, color: C.text3, marginLeft: 8 }}>You</span>}
              </MemberRow>
            );
          })}
        </div>

        <div>
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Pending invitations</span></div>
            {localInvites.length === 0 ? (
              <div style={{ padding: "20px 14px", fontSize: 12, color: C.text3, textAlign: "center" }}>No pending invitations</div>
            ) : localInvites.map(inv => (
              <Row key={inv.id}>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.text }}>{inv.email}</div>
                <Tag v={ROLE_TAG[inv.role].v}>{ROLE_TAG[inv.role].label}</Tag>
                <div style={{ fontSize: 11, color: C.text2 }}>expires {fmtExpiry(inv.expiresAt)}</div>
                <button style={{ ...BTN("sm"), marginLeft: 8 }} onClick={() => resendInvite(inv.id)}>Resend</button>
                <button style={BTN("danger", { fontSize: 10, padding: "3px 8px" })} onClick={() => cancelInvite(inv.id)}>Cancel</button>
              </Row>
            ))}
            <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}` }}>
              <button style={BTN("primary", { fontSize: 10, padding: "4px 9px" })} onClick={() => setShowInvite(true)}>+ New invitation</button>
            </div>
          </div>

          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Permissions by role</span></div>
            {[
              ["Admin",   "All actions · delete projects · billing · team management"],
              ["Manager", "Create/edit projects · features · risks · invitations"],
              ["Viewer",  "Read only · financials visible · no write access"],
            ].map(([role, desc]) => (
              <Row key={role}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text, width: 80 }}>{role}</div>
                <div style={{ fontSize: 11, color: C.text2 }}>{desc}</div>
              </Row>
            ))}
          </div>
        </div>
      </div>

      <ModalInvite   open={showInvite}   onClose={() => { setShowInvite(false);   toast("Invitation sent", "ok");   }} />
      <ModalEditRole open={showEditRole} onClose={() => { setShowEditRole(false); toast("Role updated", "ok");      }} />
      <ToastContainer />
    </div>
  );
}
