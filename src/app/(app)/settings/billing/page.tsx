"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface BillingInfo {
  plan: "FREE" | "PRO" | "TEAM";
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export default function BillingPage() {
  const { user } = useUser();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/info")
      .then((r) => r.json())
      .then((data) => {
        setBilling(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCheckout = async (plan: "PRO" | "TEAM") => {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  };

  const plans = [
    {
      id: "FREE",
      name: "Free",
      price: "$0",
      period: "forever",
      features: ["3 projects", "10 AI generations/mo", "1 team member"],
      cta: "Current Plan",
      disabled: true,
    },
    {
      id: "PRO",
      name: "Pro",
      price: "$19",
      period: "per month",
      features: ["Unlimited projects", "500 AI generations/mo", "5 team members", "Priority support"],
      cta: "Upgrade to Pro",
      disabled: false,
    },
    {
      id: "TEAM",
      name: "Team",
      price: "$49",
      period: "per month",
      features: ["Unlimited projects", "Unlimited AI generations", "Unlimited members", "SSO + audit log"],
      cta: "Upgrade to Team",
      disabled: false,
    },
  ];

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">Loading billing info…</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Plans</h1>
        <p className="text-gray-400 mt-1">
          Manage your subscription and payment details.
        </p>
      </div>

      {/* Current status */}
      {billing && billing.plan !== "FREE" && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Current plan</p>
            <p className="text-white font-semibold text-lg">{billing.plan}</p>
            {billing.currentPeriodEnd && (
              <p className="text-gray-500 text-sm mt-0.5">
                {billing.cancelAtPeriodEnd ? "Cancels" : "Renews"} on{" "}
                {new Date(billing.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition disabled:opacity-50"
          >
            {portalLoading ? "Loading…" : "Manage subscription"}
          </button>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = billing?.plan === plan.id;
          const isPopular = plan.id === "PRO";
          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-6 flex flex-col gap-4 ${
                isPopular
                  ? "border-blue-500 bg-blue-950/30"
                  : "border-gray-700 bg-gray-800"
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                  Most popular
                </span>
              )}
              <div>
                <h2 className="text-white font-bold text-lg">{plan.name}</h2>
                <p className="text-3xl font-extrabold text-white mt-1">
                  {plan.price}
                  <span className="text-sm font-normal text-gray-400 ml-1">
                    /{plan.period}
                  </span>
                </p>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="mt-2 text-center text-sm text-gray-400 py-2 border border-gray-600 rounded-lg">
                  ✓ Your current plan
                </div>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.id as "PRO" | "TEAM")}
                  disabled={!!checkoutLoading}
                  className={`mt-2 w-full py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
                    isPopular
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                >
                  {checkoutLoading === plan.id ? "Loading…" : plan.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ / note */}
      <p className="text-gray-500 text-sm text-center">
        All plans include a 14-day free trial. Cancel anytime. Payments processed
        securely by Stripe.
      </p>
    </div>
  );
}