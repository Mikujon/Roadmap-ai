import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { PLANS } from "@/lib/stripe";

export default async function BillingPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
  if (!can.viewBilling(ctx.role as Role)) redirect("/dashboard");

  const current = ctx.org.subscriptionStatus;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 32px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#E2EBF6" }}>Billing</h2>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 32 }}>
        Current plan: <strong style={{ color: "#E2EBF6" }}>{current}</strong>
        {ctx.org.currentPeriodEnd
          ? ` · renews ${new Date(ctx.org.currentPeriodEnd).toLocaleDateString()}`
          : ""}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
        {Object.entries(PLANS).map(([key, plan]) => {
          const isCurrent = current === key;
          return (
            <div key={key} style={{ background: "#0D1929", border: `1px solid ${isCurrent ? "#007A73" : "#1E3A5F"}`, borderRadius: 12, padding: 24 }}>
              {isCurrent && (
                <div style={{ fontSize: 10, color: "#007A73", fontWeight: 700, marginBottom: 10, letterSpacing: "0.05em" }}>CURRENT PLAN</div>
              )}
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "#E2EBF6" }}>{plan.name}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#007A73", marginBottom: 16 }}>
                {plan.price === 0 ? "Free" : `$${plan.price}/mo`}
              </div>
              <div style={{ fontSize: 12, color: "#64748B", display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                <span>✓ {plan.projects === -1 ? "Unlimited" : plan.projects} project{plan.projects !== 1 ? "s" : ""}</span>
                <span>✓ {plan.members === -1 ? "Unlimited" : plan.members} member{plan.members !== 1 ? "s" : ""}</span>
                {key !== "FREE" && <span>✓ AI roadmap generation</span>}
                {key === "BUSINESS" && <span>✓ SSO + custom branding</span>}
              </div>
              {!isCurrent && key !== "FREE" && (
                <form action="/api/billing/checkout" method="POST">
                  <input type="hidden" name="priceId" value={key === "PRO" ? process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "" : process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS ?? ""} />
                  <button type="submit" style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg,#007A73,#0a9a90)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Upgrade to {plan.name}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {current !== "FREE" && (
        <form action="/api/billing/portal" method="POST">
          <button type="submit" style={{ padding: "10px 22px", background: "#0F1827", color: "#64748B", border: "1px solid #1E3A5F", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
            Manage subscription →
          </button>
        </form>
      )}
    </div>
  );
}