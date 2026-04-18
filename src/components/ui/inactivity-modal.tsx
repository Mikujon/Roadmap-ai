"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useClerk } from "@clerk/nextjs";

const INACTIVITY_MS  = 30 * 60 * 1000; // 30 minutes
const COUNTDOWN_SEC  = 60;             // 60-second countdown before auto-logout

export function InactivityModal() {
  const { signOut } = useClerk();
  const [showWarning, setShowWarning]   = useState(false);
  const [countdown, setCountdown]       = useState(COUNTDOWN_SEC);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countdownTimer  = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const resetTimer = useCallback(() => {
    if (showWarning) return; // don't reset if modal is showing
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(COUNTDOWN_SEC);
    }, INACTIVITY_MS);
  }, [showWarning]);

  // Start countdown when warning shows
  useEffect(() => {
    if (!showWarning) return;
    clearInterval(countdownTimer.current);
    countdownTimer.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownTimer.current);
          signOut({ redirectUrl: "/sign-in" }).catch(() => {});
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownTimer.current);
  }, [showWarning, signOut]);

  // Listen to user activity
  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearTimeout(inactivityTimer.current);
      clearInterval(countdownTimer.current);
    };
  }, [resetTimer]);

  const stayLoggedIn = () => {
    setShowWarning(false);
    clearInterval(countdownTimer.current);
    resetTimer();
  };

  if (!showWarning) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", border: "1px solid #E5E2D9", overflow: "hidden" }}>
        <div style={{ padding: "24px 28px 20px", textAlign: "center", borderBottom: "1px solid #F4F2EC" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⏱</div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#18170F", marginBottom: 8 }}>Still there?</h2>
          <p style={{ fontSize: 13, color: "#5C5A52", lineHeight: 1.5 }}>
            You've been inactive for 30 minutes. For security, you'll be automatically signed out in:
          </p>
          <div style={{ fontSize: 40, fontWeight: 800, color: countdown <= 10 ? "#DC2626" : "#006D6B", marginTop: 16, letterSpacing: "-1px", fontFamily: "monospace" }}>
            {String(countdown).padStart(2, "0")}s
          </div>
        </div>
        <div style={{ padding: "16px 28px 20px", display: "flex", gap: 10 }}>
          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" }).catch(() => {})}
            style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600, border: "1.5px solid #E5E2D9", borderRadius: 9, background: "#fff", color: "#5C5A52", cursor: "pointer", fontFamily: "inherit" }}
          >
            Sign Out
          </button>
          <button
            onClick={stayLoggedIn}
            style={{ flex: 2, padding: "10px 0", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 9, background: "#006D6B", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
