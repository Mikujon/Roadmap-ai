import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { PLANS } from "@/lib/stripe";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default async function BillingPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
  if (!can.viewBilling(ctx.role as Role)) redirect("/dashboard");

  const current = ctx.org.subscriptionStatus;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 32px" }}>
      <Breadcrumb items={[{ label: "Settings", href: "/settings" }, { label: "Billing" }]} />
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: "#18170F" }}>Billing</h2>
      <p style={{ fontSize: 13, color: "#5C5A52", marginBottom: 32 }}>
        Current plan: <strong style={{ color: "#18170F" }}>{current}</strong>
        {ctx.org.currentPeriodEnd
          ? ` · renews ${new Date(ctx.org.currentPeriodEnd).toLocaleDateString()}`
          : ""}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
        {Object.entries(PLANS).map(([key, plan]) => {
          const isCurrent = current === key;
          return (
            <div
              key={key}
              style={{
                background: "#fff",
                border: `1.5px solid ${isCurrent ? "#006D6B" : "#E5E2D9"}`,
                borderRadius: 12, padding: 24, position: "relative",
              }}
            >
              {isCurrent && (
                <div style={{
                  position: "absolute", top: -1, left: 20,
                  fontSize: 9, color: "#fff", fontWeight: 700,
                  background: "#006D6B", padding: "2px 10px",
                  borderRadius: "0 0 6px 6px", letterSpacing: "0.07em",
                }}>
                  CURRENT
                </div>
              )}
              <div style={{ fontSize: 15, fontWeight: 700, color: "#18170F", marginBottom: 4, marginTop: isCurrent ? 8 : 0 }}>
                {plan.name}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#006D6B", marginBottom: 16 }}>
                {plan.price === 0 ? "Free" : `$${plan.price}/mo`}
              </div>
              <div style={{ fontSize: 12, color: "#5C5A52", display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
                <span>✓ {plan.projects === -1 ? "Unlimited" : plan.projects} project{plan.projects !== 1 ? "s" : ""}</span>
                <span>✓ {plan.members  === -1 ? "Unlimited" : plan.members}  member{plan.members !== 1 ? "s" : ""}</span>
                {key !== "FREE"     && <span>✓ AI roadmap generation</span>}
                {key === "BUSINESS" && <span>✓ SSO + custom branding</span>}
              </div>
              {!isCurrent && key !== "FREE" && (
                <form action="/api/billing/checkout" method="POST">
                  <input
                    type="hidden" name="priceId"
                    value={key === "PRO"
                      ? process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? ""
                      : process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS ?? ""}
                  />
                  <button
                    type="submit"
                    style={{
                      width: "100%", padding: "9px", background: "#006D6B",
                      color: "#fff", border: "none", borderRadius: 8,
                      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
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
          <button
            type="submit"
            style={{
              padding: "9px 20px", background: "#fff", color: "#5C5A52",
              border: "1px solid #E5E2D9", borderRadius: 8, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Manage subscription →
          </button>
        </form>
      )}
    </div>
  );
}
