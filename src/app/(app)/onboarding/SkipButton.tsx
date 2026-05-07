"use client";

export function SkipButton() {
  async function handleSkip() {
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch {}
    window.location.href = "/dashboard";
  }

  return (
    <button
      onClick={handleSkip}
      style={{
        fontSize: 13, color: "#9E9C93",
        background: "none", border: "none",
        cursor: "pointer", fontFamily: "inherit",
        textDecoration: "underline",
        padding: 0,
      }}
    >
      Skip for now → Go to Dashboard
    </button>
  );
}
