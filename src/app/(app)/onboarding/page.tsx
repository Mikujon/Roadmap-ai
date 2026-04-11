import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import Link from "next/link";

export default async function OnboardingPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  // Check completion status
  const projectCount = await db.project.count({ where: { organisationId: ctx.org.id } });
  const hasProject   = projectCount > 0;
  const hasOrg       = !!ctx.org.id;

  // If onboarding complete → redirect to dashboard
  if (hasProject) redirect("/dashboard");

  const steps = [
    {
      id: 1, done: true,
      title: "Create your account",
      detail: "You're signed in and ready to go.",
      action: null,
    },
    {
      id: 2, done: hasOrg,
      title: "Set up your organization",
      detail: hasOrg ? `Organization "${ctx.org.name}" is ready.` : "Create an organization to collaborate with your team.",
      action: hasOrg ? null : { label: "Create Organization", href: "/settings" },
    },
    {
      id: 3, done: false,
      title: "Create your first project",
      detail: "Generate a full project roadmap with sprints, phases and features using AI.",
      action: { label: "Create First Project →", href: "/projects/new" },
    },
    {
      id: 4, done: false,
      title: "Invite your team",
      detail: "Invite managers and viewers to collaborate on your projects.",
      action: { label: "Invite Members", href: "/settings/team" },
    },
  ];

  const completedSteps = steps.filter(s => s.done).length;
  const progress = Math.round((completedSteps / steps.length) * 100);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#F0F2F5", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, background: "linear-gradient(135deg, #006D6B, #0891B2)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: "#fff", margin: "0 auto 16px", boxShadow: "0 4px 16px rgba(0,109,107,0.3)" }}>RM</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", marginBottom: 8, letterSpacing: "-0.5px" }}>Welcome to RoadmapAI</h1>
            <p style={{ fontSize: 14, color: "#64748B" }}>Let's get you set up in a few steps</p>
          </div>

          {/* Progress */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1, height: 6, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: progress + "%", background: "linear-gradient(90deg, #006D6B, #0891B2)", borderRadius: 3, transition: "width 0.5s" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#006D6B", minWidth: 40 }}>{progress}%</span>
            <span style={{ fontSize: 12, color: "#94A3B8" }}>{completedSteps}/{steps.length} done</span>
          </div>

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {steps.map((step, i) => (
              <div key={step.id} style={{ background: "#fff", border: `1px solid ${step.done ? "#A7F3D0" : i === completedSteps ? "#BFDBFE" : "#E2E8F0"}`, borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, opacity: i > completedSteps ? 0.5 : 1 }}>
                {/* Step indicator */}
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: step.done ? "#ECFDF5" : i === completedSteps ? "#EFF6FF" : "#F8FAFC", border: `2px solid ${step.done ? "#059669" : i === completedSteps ? "#2563EB" : "#E2E8F0"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700, color: step.done ? "#059669" : i === completedSteps ? "#2563EB" : "#CBD5E1" }}>
                  {step.done ? "✓" : step.id}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: step.done ? "#059669" : "#0F172A", marginBottom: 3 }}>{step.title}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{step.detail}</div>
                </div>
                {step.action && (
                  <Link href={step.action.href} style={{ padding: "8px 16px", background: i === completedSteps ? "#006D6B" : "#F8FAFC", color: i === completedSteps ? "#fff" : "#64748B", border: `1px solid ${i === completedSteps ? "#006D6B" : "#E2E8F0"}`, borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
                    {step.action.label}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Skip */}
          <div style={{ textAlign: "center" }}>
            <Link href="/dashboard" style={{ fontSize: 13, color: "#94A3B8", textDecoration: "none" }}>
              Skip for now → Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}