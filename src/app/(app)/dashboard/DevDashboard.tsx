"use client";
import Link from "next/link";

type FeatStatus = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
type FeatPriority = "HIGH" | "MEDIUM" | "LOW" | "CRITICAL";

interface FeatureItem {
  id: string;
  title: string;
  status: FeatStatus;
  priority: FeatPriority;
  estimatedHours: number | null;
  actualHours: number | null;
  sprint: {
    id: string;
    name: string;
    endDate: string | null;
    project: { id: string; name: string };
  };
}

interface Props {
  userName: string;
  orgName: string;
  features: FeatureItem[];
  sprintDone: number;
  sprintTotal: number;
  sprintName: string | null;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const PRIORITY_STYLE: Record<string, React.CSSProperties> = {
  CRITICAL: { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" },
  HIGH:     { background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" },
  MEDIUM:   { background: "#EFF6FF", color: "#1E3A8A", border: "1px solid #BFDBFE" },
  LOW:      { background: "#F4F2EC", color: "#5C5A52", border: "1px solid #E5E2D9" },
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  BLOCKED:     { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" },
  IN_PROGRESS: { background: "#F0FDF4", color: "#14532D", border: "1px solid #BBF7D0" },
  TODO:        { background: "#F8F7F3", color: "#5C5A52", border: "1px solid #E5E2D9" },
};

const STATUS_LABEL: Record<string, string> = {
  BLOCKED: "Blocked", IN_PROGRESS: "In Progress", TODO: "To Do",
};

function FeatureCard({ feature }: { feature: FeatureItem }) {
  const daysLeft = feature.sprint.endDate
    ? Math.ceil((new Date(feature.sprint.endDate).getTime() - Date.now()) / 86400000)
    : null;

  const deadlineColor = daysLeft == null ? "#9E9C93"
    : daysLeft < 0 ? "#DC2626"
    : daysLeft <= 3 ? "#D97706"
    : "#5C5A52";

  return (
    <div style={{
      background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10,
      padding: "12px 14px", marginBottom: 8,
      borderLeft: feature.status === "BLOCKED" ? "3px solid #DC2626" : feature.status === "IN_PROGRESS" ? "3px solid #059669" : "3px solid #E5E2D9",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F", lineHeight: 1.4, marginBottom: 3 }}>{feature.title}</div>
          <div style={{ fontSize: 11, color: "#9E9C93" }}>
            {feature.sprint.project.name} · {feature.sprint.name}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, ...PRIORITY_STYLE[feature.priority] ?? PRIORITY_STYLE.LOW }}>
            {feature.priority}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, ...STATUS_STYLE[feature.status] ?? STATUS_STYLE.TODO }}>
            {STATUS_LABEL[feature.status] ?? feature.status}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10, color: deadlineColor }}>
          {daysLeft == null ? "No deadline"
           : daysLeft < 0 ? `Sprint overdue by ${Math.abs(daysLeft)}d`
           : daysLeft === 0 ? "Sprint ends today"
           : `Sprint ends in ${daysLeft}d`}
        </div>
        <Link href={`/projects/${feature.sprint.project.id}/board`} style={{
          fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 6,
          background: "#F8F7F3", border: "1px solid #E5E2D9", color: "#5C5A52",
          textDecoration: "none",
        }}>
          Go to board →
        </Link>
      </div>
    </div>
  );
}

export default function DevDashboard({ userName, orgName, features, sprintDone, sprintTotal, sprintName }: Props) {
  const firstName = userName.split(" ")[0] || "there";
  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const blocked    = features.filter(f => f.status === "BLOCKED");
  const inProgress = features.filter(f => f.status === "IN_PROGRESS");
  const todo       = features.filter(f => f.status === "TODO");

  const sprintPct = sprintTotal > 0 ? Math.round((sprintDone / sprintTotal) * 100) : 0;

  const kpis = [
    { label: "In progress",    value: inProgress.length, sub: "tasks active now",      bg: "#F0FDF4", border: "#BBF7D0", vc: "#14532D" },
    { label: "To do",          value: todo.length,       sub: "tasks not started",     bg: "#F8F7F3", border: "#E5E2D9", vc: "#18170F" },
    { label: "Blocked",        value: blocked.length,    sub: "need unblocking",        bg: blocked.length > 0 ? "#FEF2F2" : "#F8F7F3", border: blocked.length > 0 ? "#FECACA" : "#E5E2D9", vc: blocked.length > 0 ? "#991B1B" : "#18170F" },
    { label: "Sprint progress", value: `${sprintPct}%`,  sub: sprintName ?? "no active sprint", bg: "#EFF6FF", border: "#BFDBFE", vc: "#1E3A8A" },
  ];

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#18170F", letterSpacing: "-.4px" }}>
          {getGreeting()}, {firstName}
        </div>
        <div style={{ fontSize: 11, color: "#5C5A52", marginTop: 4 }}>
          {dateStr} · {orgName} · <strong style={{ color: "#2563EB" }}>Developer view</strong>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            borderRadius: 12, padding: "14px 16px",
            background: k.bg, border: `1px solid ${k.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,.07)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#5C5A52", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, letterSpacing: "-.6px", color: k.vc }}>{k.value}</div>
            <div style={{ fontSize: 10, marginTop: 4, opacity: .75, color: k.vc }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Sprint progress bar */}
      {sprintName && sprintTotal > 0 && (
        <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>{sprintName}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", fontFamily: "'DM Mono', monospace" }}>
              {sprintDone}/{sprintTotal} tasks · {sprintPct}%
            </span>
          </div>
          <div style={{ height: 8, background: "#F0EEE8", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, width: `${sprintPct}%`, background: "#2563EB", transition: "width 0.4s ease" }} />
          </div>
        </div>
      )}

      {/* Task sections */}
      {features.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#18170F", marginBottom: 6 }}>No active tasks</div>
          <div style={{ fontSize: 12, color: "#9E9C93" }}>All tasks are done or no active sprints in the org</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
          {/* Left: Blocked + In Progress */}
          <div>
            {blocked.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#991B1B", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    Blocked ({blocked.length})
                  </span>
                </div>
                {blocked.map(f => <FeatureCard key={f.id} feature={f} />)}
              </div>
            )}

            {inProgress.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#14532D", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    In progress ({inProgress.length})
                  </span>
                </div>
                {inProgress.map(f => <FeatureCard key={f.id} feature={f} />)}
              </div>
            )}
          </div>

          {/* Right: To Do */}
          <div>
            {todo.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#9E9C93" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#5C5A52", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    To do ({todo.length})
                  </span>
                </div>
                {todo.slice(0, 15).map(f => <FeatureCard key={f.id} feature={f} />)}
                {todo.length > 15 && (
                  <div style={{ fontSize: 11, color: "#9E9C93", textAlign: "center", padding: "8px 0" }}>
                    +{todo.length - 15} more tasks
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
