"use client";
import Link from "next/link";

type FeatStatus   = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
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

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function DevInsights({ userName, orgName, features, sprintDone, sprintTotal, sprintName }: Props) {
  const firstName = userName.split(" ")[0] || "there";
  const dateStr   = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const sprintPct = sprintTotal > 0 ? Math.round((sprintDone / sprintTotal) * 100) : 0;

  const inProgress = features
    .filter(f => f.status === "IN_PROGRESS")
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const blocked = features
    .filter(f => f.status === "BLOCKED")
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const todo = features
    .filter(f => f.status === "TODO")
    .sort((a, b) => {
      // sort by sprint deadline first, then priority
      const aDeadline = a.sprint.endDate ? new Date(a.sprint.endDate).getTime() : Infinity;
      const bDeadline = b.sprint.endDate ? new Date(b.sprint.endDate).getTime() : Infinity;
      if (aDeadline !== bDeadline) return aDeadline - bDeadline;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    })
    .slice(0, 12);

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { label: "In progress",    value: inProgress.length, sub: "active now",         bg: "#F0FDF4", border: "#BBF7D0", vc: "#14532D" },
          { label: "To do",          value: todo.length + (features.filter(f=>f.status==="TODO").length - todo.length), sub: "tasks queued",  bg: "#F8F7F3", border: "#E5E2D9", vc: "#18170F" },
          { label: "Blocked",        value: blocked.length, sub: "need unblocking",      bg: blocked.length > 0 ? "#FEF2F2" : "#F8F7F3", border: blocked.length > 0 ? "#FECACA" : "#E5E2D9", vc: blocked.length > 0 ? "#991B1B" : "#18170F" },
          { label: "Sprint progress",value: `${sprintPct}%`, sub: sprintName ?? "no active sprint", bg: "#EFF6FF", border: "#BFDBFE", vc: "#1E3A8A" },
        ].map(k => (
          <div key={k.label} style={{ borderRadius: 12, padding: "14px 16px", background: k.bg, border: `1px solid ${k.border}`, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#5C5A52", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, letterSpacing: "-.6px", color: k.vc }}>{k.value}</div>
            <div style={{ fontSize: 10, marginTop: 5, color: k.vc, opacity: .75 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Sprint progress bar */}
      {sprintName && sprintTotal > 0 && (
        <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>{sprintName}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", fontFamily: "'DM Mono', monospace" }}>
              {sprintDone}/{sprintTotal} · {sprintPct}%
            </span>
          </div>
          <div style={{ height: 8, background: "#F0EEE8", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${sprintPct}%`, background: "#2563EB", borderRadius: 99, transition: "width .4s" }} />
          </div>
        </div>
      )}

      {features.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#18170F", marginBottom: 6 }}>All clear!</div>
          <div style={{ fontSize: 12, color: "#9E9C93" }}>No active tasks in current sprints</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
          {/* Left: Blocked + In Progress */}
          <div>
            {blocked.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #FECACA", borderRadius: 12, overflow: "hidden", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
                <div style={{ padding: "9px 14px", borderBottom: "1px solid #FECACA", background: "#FEF2F2" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#991B1B", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    Blocked ({blocked.length})
                  </span>
                </div>
                {blocked.map((f, i) => <TaskRow key={f.id} feature={f} last={i === blocked.length - 1} />)}
              </div>
            )}

            {inProgress.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #BBF7D0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
                <div style={{ padding: "9px 14px", borderBottom: "1px solid #BBF7D0", background: "#F0FDF4" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#14532D", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    In progress ({inProgress.length})
                  </span>
                </div>
                {inProgress.map((f, i) => <TaskRow key={f.id} feature={f} last={i === inProgress.length - 1} />)}
              </div>
            )}
          </div>

          {/* Right: To Do */}
          {todo.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
              <div style={{ padding: "9px 14px", borderBottom: "1px solid #E5E2D9", background: "#F8F7F3" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#5C5A52", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  To do ({features.filter(f => f.status === "TODO").length})
                </span>
              </div>
              {todo.map((f, i) => <TaskRow key={f.id} feature={f} last={i === todo.length - 1} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ feature: f, last }: { feature: FeatureItem; last: boolean }) {
  const daysLeft = f.sprint.endDate
    ? Math.ceil((new Date(f.sprint.endDate).getTime() - Date.now()) / 86400000) : null;

  const deadlineColor = daysLeft == null ? "#9E9C93"
    : daysLeft < 0    ? "#DC2626"
    : daysLeft <= 3   ? "#D97706"
    : "#9E9C93";

  return (
    <div style={{
      padding: "10px 14px",
      borderBottom: last ? "none" : "1px solid #F0EEE8",
      borderLeft: f.status === "BLOCKED" ? "3px solid #DC2626" : f.status === "IN_PROGRESS" ? "3px solid #059669" : "3px solid #F0EEE8",
      background: f.status === "BLOCKED" ? "rgba(220,38,38,.02)" : undefined,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#18170F", lineHeight: 1.35 }}>{f.title}</div>
          <div style={{ fontSize: 10, color: "#9E9C93", marginTop: 2 }}>
            {f.sprint.project.name} · {f.sprint.name}
          </div>
        </div>
        <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 20, flexShrink: 0, ...PRIORITY_STYLE[f.priority] ?? PRIORITY_STYLE.LOW }}>
          {f.priority}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: deadlineColor }}>
          {daysLeft == null ? "No deadline"
            : daysLeft < 0  ? `Overdue by ${Math.abs(daysLeft)}d`
            : daysLeft === 0 ? "Sprint ends today"
            : `${daysLeft}d left`}
        </span>
        <Link href={`/projects/${f.sprint.project.id}/board`} style={{
          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
          background: "#F8F7F3", border: "1px solid #E5E2D9", color: "#5C5A52", textDecoration: "none",
        }}>
          Board →
        </Link>
      </div>
    </div>
  );
}
