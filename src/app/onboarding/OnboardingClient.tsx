"use client";
import { CreateOrganization } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingClient({
  step,
  orgName,
}: {
  step:    "create-org" | "complete";
  orgName: string;
}) {
  const router  = useRouter();
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } finally {
      router.push("/dashboard");
    }
  }

  return (
    <div style={{
      minHeight:       "100vh",
      background:      "#F8F7F3",
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "center",
      fontFamily:      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        background:   "#FFFFFF",
        border:       "1px solid #E5E2D9",
        borderRadius: 16,
        padding:      "48px 40px",
        maxWidth:     480,
        width:        "100%",
        textAlign:    "center",
      }}>
        <div style={{
          width:        48,
          height:       48,
          borderRadius: 12,
          background:   "#006D6B",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          margin:       "0 auto 24px",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h5M3 12h9M3 18h6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="13" cy="6" r="2.5" stroke="#fff" strokeWidth="1.8"/>
            <circle cx="19" cy="12" r="2.5" stroke="#fff" strokeWidth="1.8"/>
            <circle cx="15" cy="18" r="2.5" stroke="#fff" strokeWidth="1.8"/>
          </svg>
        </div>

        {step === "create-org" ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#18170F", marginBottom: 8, letterSpacing: "-0.4px" }}>
              Welcome to RoadmapAI
            </h1>
            <p style={{ fontSize: 14, color: "#5C5A52", marginBottom: 32, lineHeight: 1.5 }}>
              Create your organisation to get started. You&apos;ll be able to invite your team and manage projects right away.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <CreateOrganization afterCreateOrganizationUrl="/onboarding" />
            </div>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#18170F", marginBottom: 8, letterSpacing: "-0.4px" }}>
              {orgName ? `${orgName} is ready` : "Your workspace is ready"}
            </h1>
            <p style={{ fontSize: 14, color: "#5C5A52", marginBottom: 32, lineHeight: 1.5 }}>
              Your organisation has been set up. Head to the dashboard to create your first project and start tracking progress.
            </p>
            <button
              onClick={finish}
              disabled={busy}
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          8,
                background:   "#006D6B",
                color:        "#fff",
                border:       "none",
                borderRadius: 8,
                padding:      "12px 28px",
                fontSize:     14,
                fontWeight:   600,
                cursor:       busy ? "not-allowed" : "pointer",
                opacity:      busy ? 0.7 : 1,
                transition:   "opacity .15s",
              }}
            >
              {busy ? "Setting up…" : "Go to Dashboard →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
