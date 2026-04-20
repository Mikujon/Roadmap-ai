"use client";
import { useState } from "react";
import Link from "next/link";

type FeatStatus   = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
type FeatPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type FilterMode   = "all" | "in_progress" | "blocked" | "done";
type SortMode     = "priority" | "deadline" | "project";

interface Feature {
  id: string;
  title: string;
  status: FeatStatus;
  priority: FeatPriority;
  estimatedHours: number | null;
  actualHours: number | null;
  sprint: {
    id: string;
    name: string;
    status: string;
    endDate: string | null;
    project: { id: string; name: string };
  };
}

interface Props {
  features: Feature[];
  userName: string;
}

const PRIORITY_ORDER: Record<FeatPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const PRIORITY_STYLE: Record<FeatPriority, React.CSSProperties> = {
  CRITICAL: { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" },
  HIGH:     { background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" },
  MEDIUM:   { background: "#EFF6FF", color: "#1E3A8A", border: "1px solid #BFDBFE" },
  LOW:      { background: "#F4F2EC", color: "#5C5A52", border: "1px solid #E5E2D9" },
};

const STATUS_LABEL: Record<FeatStatus, string> = {
  TODO: "To Do", IN_PROGRESS: "In Progress", BLOCKED: "Blocked", DONE: "Done",
};

const STATUS_DOT: Record<FeatStatus, string> = {
  TODO: "#9CA3AF", IN_PROGRESS: "#2563EB", BLOCKED: "#DC2626", DONE: "#059669",
};

export default function MyTasksClient({ features, userName }: Props) {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort,   setSort]   = useState<SortMode>("priority");

  const filtered = features.filter(f => {
    if (filter === "all")         return f.status !== "DONE";
    if (filter === "in_progress") return f.status === "IN_PROGRESS";
    if (filter === "blocked")     return f.status === "BLOCKED";
    if (filter === "done")        return f.status === "DONE";
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (sort === "deadline") {
      const aD = a.sprint.endDate ? new Date(a.sprint.endDate).getTime() : Infinity;
      const bD = b.sprint.endDate ? new Date(b.sprint.endDate).getTime() : Infinity;
      return aD - bD;
    }
    if (sort === "project") return a.sprint.project.name.localeCompare(b.sprint.project.name);
    return 0;
  });

  // Group by project + sprint
  const groups = new Map<string, { label: string; projectId: string; items: Feature[] }>();
  for (const f of sorted) {
    const key = `${f.sprint.project.id}__${f.sprint.id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        label: `${f.sprint.project.name} › ${f.sprint.name}`,
        projectId: f.sprint.project.id,
        items: [],
      });
    }
    groups.get(key)!.items.push(f);
  }

  const counts = {
    all:         features.filter(f => f.status !== "DONE").length,
    in_progress: features.filter(f => f.status === "IN_PROGRESS").length,
    blocked:     features.filter(f => f.status === "BLOCKED").length,
    done:        features.filter(f => f.status === "DONE").length,
  };

  const FILTERS: { id: FilterMode; label: string; count: number }[] = [
    { id: "all",         label: "Active",      count: counts.all         },
    { id: "in_progress", label: "In Progress", count: counts.in_progress },
    { id: "blocked",     label: "Blocked",     count: counts.blocked     },
    { id: "done",        label: "Done",        count: counts.done        },
  ];

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#18170F", letterSpacing: "-.4px" }}>
          My tasks
        </div>
        <div style={{ fontSize: 11, color: "#5C5A52", marginTop: 4 }}>{userName}</div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 2, background: "#F4F2EC", border: "1px solid #E5E2D9", borderRadius: 9, padding: 3 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6,
              border: "none", cursor: "pointer", fontFamily: "inherit",
              background: filter === f.id ? "#18170F" : "transparent",
              color:      filter === f.id ? "#fff"    : "#5C5A52",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              {f.label}
              <span style={{ fontSize: 10, background: filter === f.id ? "rgba(255,255,255,.2)" : "#E5E2D9", color: filter === f.id ? "#fff" : "#9E9C93", borderRadius: 8, padding: "0 5px", minWidth: 16, textAlign: "center" }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Sort */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9E9C93" }}>
          Sort:
          {(["priority", "deadline", "project"] as SortMode[]).map(s => (
            <button key={s} onClick={() => setSort(s)} style={{
              fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
              border: "none", cursor: "pointer", fontFamily: "inherit",
              background: sort === s ? "#F0EEE8" : "transparent",
              color:      sort === s ? "#18170F" : "#9E9C93",
            }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Task list grouped */}
      {groups.size === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#18170F", marginBottom: 6 }}>Nothing here</div>
          <div style={{ fontSize: 12, color: "#9E9C93" }}>No tasks match the current filter</div>
        </div>
      ) : [...groups.values()].map(group => (
        <div key={group.label} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#5C5A52" }}>{group.label}</span>
            <span style={{ fontSize: 10, color: "#9E9C93" }}>{group.items.length} task{group.items.length !== 1 ? "s" : ""}</span>
            <Link href={`/projects/${group.projectId}/board`} style={{ fontSize: 10, color: "#006D6B", fontWeight: 600, textDecoration: "none", marginLeft: "auto" }}>
              Board →
            </Link>
          </div>
          <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
            {group.items.map((f, i) => {
              const daysLeft = f.sprint.endDate
                ? Math.ceil((new Date(f.sprint.endDate).getTime() - Date.now()) / 86400000)
                : null;
              const dlColor = daysLeft == null ? "#9E9C93" : daysLeft < 0 ? "#DC2626" : daysLeft <= 3 ? "#D97706" : "#9E9C93";
              return (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  borderBottom: i < group.items.length - 1 ? "1px solid #F0EEE8" : "none",
                  borderLeft: f.status === "BLOCKED" ? "3px solid #DC2626" : f.status === "IN_PROGRESS" ? "3px solid #059669" : "3px solid transparent",
                  background: f.status === "BLOCKED" ? "rgba(220,38,38,.02)" : undefined,
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_DOT[f.status], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#18170F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</div>
                    <div style={{ fontSize: 10, color: dlColor, marginTop: 1 }}>
                      {daysLeft == null ? "No deadline"
                        : daysLeft < 0  ? `Overdue by ${Math.abs(daysLeft)}d`
                        : daysLeft === 0 ? "Due today"
                        : `${daysLeft}d left`}
                      {f.estimatedHours != null && ` · ${f.estimatedHours}h est`}
                    </div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0, ...PRIORITY_STYLE[f.priority] }}>
                    {f.priority}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#F8F7F3", color: "#5C5A52", border: "1px solid #E5E2D9", flexShrink: 0 }}>
                    {STATUS_LABEL[f.status]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
