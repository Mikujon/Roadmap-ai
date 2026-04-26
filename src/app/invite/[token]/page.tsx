import { db } from "@/lib/prisma";
import Link from "next/link";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const inv = await db.invitation.findUnique({
    where:   { token },
    include: { organisation: true },
  });

  if (!inv || inv.status !== "PENDING" || inv.expiresAt < new Date()) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.iconRed}>✕</div>
          <h1 style={styles.title}>Invitation not valid</h1>
          <p style={styles.sub}>This invitation link has expired, already been used, or does not exist.</p>
          <Link href="/sign-in" style={styles.btn}>Go to Sign In →</Link>
        </div>
      </div>
    );
  }

  const signUpUrl = `/sign-up?email=${encodeURIComponent(inv.email)}`;
  const role = inv.role.charAt(0) + inv.role.slice(1).toLowerCase();

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>RM</div>
          <h1 style={styles.heading}>You&apos;re invited!</h1>
        </div>
        <div style={styles.body}>
          <p style={styles.text}>
            You have been invited to join <strong>{inv.organisation.name}</strong> on RoadmapAI as a <strong style={{ color: "#006D6B" }}>{role}</strong>.
          </p>
          <p style={styles.meta}>Invited email: {inv.email}</p>
          <p style={styles.meta}>Expires: {inv.expiresAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
          <div style={styles.actions}>
            <Link href={signUpUrl} style={styles.btn}>Accept &amp; Create Account →</Link>
            <Link href="/sign-in" style={styles.btnSecondary}>I already have an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:        { minHeight: "100vh", background: "#F0F2F5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24 } as React.CSSProperties,
  card:        { background: "#fff", borderRadius: 16, overflow: "hidden" as const, boxShadow: "0 4px 32px rgba(0,0,0,0.08)", maxWidth: 480, width: "100%" } as React.CSSProperties,
  header:      { background: "linear-gradient(135deg,#006D6B,#0891B2)", padding: "32px 40px", textAlign: "center" as const } as React.CSSProperties,
  logo:        { width: 48, height: 48, background: "rgba(255,255,255,0.2)", borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: "#fff", marginBottom: 12 } as React.CSSProperties,
  heading:     { color: "#fff", fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" } as React.CSSProperties,
  body:        { padding: "32px 40px" } as React.CSSProperties,
  title:       { fontSize: 20, fontWeight: 700, color: "#18170F", margin: "0 0 10px" } as React.CSSProperties,
  text:        { fontSize: 15, color: "#0F172A", lineHeight: 1.6, margin: "0 0 16px" } as React.CSSProperties,
  meta:        { fontSize: 12, color: "#64748B", margin: "0 0 6px" } as React.CSSProperties,
  sub:         { fontSize: 14, color: "#64748B", lineHeight: 1.6, margin: "0 0 24px" } as React.CSSProperties,
  iconRed:     { width: 48, height: 48, background: "#FEF2F2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#DC2626", margin: "0 auto 16px" } as React.CSSProperties,
  actions:     { display: "flex", flexDirection: "column" as const, gap: 10, marginTop: 24 } as React.CSSProperties,
  btn:         { display: "block", background: "#006D6B", color: "#fff", textDecoration: "none", padding: "13px 24px", borderRadius: 10, fontWeight: 700, fontSize: 14, textAlign: "center" as const } as React.CSSProperties,
  btnSecondary:{ display: "block", background: "#F8FAFC", color: "#5C5A52", textDecoration: "none", padding: "11px 24px", borderRadius: 10, fontWeight: 600, fontSize: 13, textAlign: "center" as const, border: "1px solid #E5E2D9" } as React.CSSProperties,
};
