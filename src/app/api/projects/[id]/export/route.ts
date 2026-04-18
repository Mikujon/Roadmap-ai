import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { getProjectMetrics } from "@/lib/metrics";
import * as XLSX from "xlsx";

function slug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d as string).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtNum(n: number, dec = 2) {
  return Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    include: {
      sprints: {
        orderBy: { num: "asc" },
        include: {
          features: {
            orderBy: { createdAt: "asc" },
            include: { assignedTo: { select: { name: true } } },
          },
        },
      },
      risks:       { orderBy: { createdAt: "desc" } },
      assignments: { include: { resource: { select: { name: true, role: true, costPerHour: true, capacityHours: true } } } },
      departments: { include: { department: { select: { name: true } } } },
      requestedBy: { select: { name: true, email: true } },
      phases:      { orderBy: { order: "asc" } },
      dependsOn:   { include: { dependsOn: { select: { id: true, name: true, status: true } } } },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const metrics = getProjectMetrics(project as any);
  const { health } = metrics;

  const { searchParams } = new URL(req.url);
  const format   = (searchParams.get("format") ?? "csv").toLowerCase();
  const filename = `${slug(project.name)}-export`;

  // ── Shared data ───────────────────────────────────────────────────────────

  const projectInfo: Record<string, string | number> = {
    "Project Name":   project.name,
    "Description":    project.description ?? "",
    "Status":         project.status,
    "Health Status":  health.status,
    "Health Score":   health.healthScore,
    "Start Date":     fmtDate(project.startDate),
    "End Date":       fmtDate(project.endDate),
    "Days Left":      health.daysLeft,
    "Delay Days":     health.delayDays,
    "Department(s)":  metrics.deptNames,
    "Requested By":   metrics.client,
    "Methodology":    (project as any).methodology ?? "",
  };

  const evmInfo: Record<string, string | number> = {
    "BAC (Budget At Completion)":    fmtNum(metrics.budgetTotal),
    "AC (Actual Cost)":              fmtNum(metrics.costActual),
    "EV (Earned Value)":             fmtNum(metrics.costEstimated * (health.progressNominal / 100)),
    "EAC (Estimate at Completion)":  fmtNum(health.eac),
    "ETC (Estimate to Complete)":    fmtNum(health.etc),
    "VAC (Variance at Completion)":  fmtNum(health.vac),
    "SPI (Schedule Perf. Index)":    fmtNum(health.spi),
    "CPI (Cost Perf. Index)":        fmtNum(health.cpi),
    "TCPI":                          fmtNum(health.tcpi),
    "Progress":                      `${health.progressNominal}%`,
    "Planned Progress":              `${metrics.plannedPct}%`,
    "Cost Forecast":                 fmtNum(metrics.costForecast),
    "Budget Delta":                  fmtNum(metrics.budgetDelta),
    "Revenue Expected":              fmtNum(metrics.revenueExpected),
    "Margin (USD)":                  fmtNum(metrics.marginEur),
    "Margin (%)":                    fmtNum(metrics.marginPct),
  };

  const featureRows = project.sprints.flatMap(sprint =>
    sprint.features.map(f => ({
      "Sprint":          sprint.name,
      "Sprint Status":   sprint.status,
      "Feature":         f.title,
      "Status":          f.status,
      "Priority":        f.priority,
      "Story Points":    (f as any).storyPoints ?? "",
      "Estimated Hours": f.estimatedHours,
      "Actual Hours":    f.actualHours,
      "Assigned To":     (f as any).assignedTo?.name ?? "",
      "Due Date":        fmtDate((f as any).dueDate),
    }))
  );

  const riskRows = project.risks.map(r => {
    const score = r.probability * r.impact;
    return {
      "Title":       r.title,
      "Status":      r.status,
      "Category":    r.category ?? "",
      "Probability": r.probability,
      "Impact":      r.impact,
      "Score (P×I)": score,
      "Level":       score >= 15 ? "CRITICAL" : score >= 10 ? "HIGH" : score >= 5 ? "MEDIUM" : "LOW",
      "Owner":       r.ownerName ?? "",
      "Mitigation":  r.mitigation ?? "",
      "Created":     fmtDate(r.createdAt),
    };
  });

  const teamRows = project.assignments.map(a => ({
    "Name":             a.resource.name,
    "Role":             a.resource.role,
    "Cost/Hour":        fmtNum(a.resource.costPerHour),
    "Capacity Hours":   a.resource.capacityHours,
    "Estimated Hours":  a.estimatedHours,
    "Actual Hours":     a.actualHours,
    "Actual Cost":      fmtNum(a.actualHours    * a.resource.costPerHour),
    "Estimated Cost":   fmtNum(a.estimatedHours * a.resource.costPerHour),
    "Utilization %":    a.resource.capacityHours > 0
      ? fmtNum((a.actualHours / a.resource.capacityHours) * 100)
      : 0,
  }));

  // ── CSV ───────────────────────────────────────────────────────────────────
  if (format === "csv") {
    const lines: string[] = [];

    const appendSection = (title: string, rows: Record<string, unknown>[]) => {
      lines.push(`# ${title}`);
      if (rows.length === 0) { lines.push("(no data)", ""); return; }
      lines.push(Object.keys(rows[0]).join(","));
      rows.forEach(r =>
        lines.push(Object.values(r).map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      );
      lines.push("");
    };

    lines.push(`# PROJECT EXPORT — ${project.name}`, `# Generated: ${new Date().toISOString()}`, "");
    appendSection("PROJECT INFO",      [projectInfo]);
    appendSection("EVM METRICS",       [evmInfo]);
    appendSection("FEATURES BY SPRINT", featureRows);
    appendSection("RISK REGISTER",     riskRows);
    appendSection("TEAM ASSIGNMENTS",  teamRows);

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  // ── JSON ──────────────────────────────────────────────────────────────────
  if (format === "json") {
    const payload = {
      exportedAt: new Date().toISOString(),
      project:    projectInfo,
      evm:        evmInfo,
      features:   featureRows,
      risks:      riskRows,
      team:       teamRows,
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type":        "application/json",
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  }

  // ── XLSX ──────────────────────────────────────────────────────────────────
  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();

    const addSheet = (name: string, rows: Record<string, unknown>[]) => {
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "(empty)": "" }]);
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    addSheet("Project Info", [projectInfo]);
    addSheet("EVM Metrics",  [evmInfo]);
    addSheet("Features",     featureRows);
    addSheet("Risks",        riskRows);
    addSheet("Team",         teamRows);

    const raw = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as number[];
    const buf = new Uint8Array(raw);

    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  // ── PDF (printable HTML) ──────────────────────────────────────────────────
  if (format === "pdf") {
    const kvRow = (label: string, value: unknown) =>
      `<tr><td class="lbl">${label}</td><td class="val">${value ?? ""}</td></tr>`;

    const tableSection = (title: string, rows: Record<string, unknown>[]) => {
      if (rows.length === 0) return `<h3>${title}</h3><p class="empty">No data</p>`;
      const keys   = Object.keys(rows[0]);
      const header = keys.map(k => `<th>${k}</th>`).join("");
      const body   = rows.map(r =>
        `<tr>${keys.map(k => `<td>${r[k] ?? ""}</td>`).join("")}</tr>`
      ).join("");
      return `<h3>${title}</h3><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${project.name} — Export</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; color: #18170F; padding: 28px 32px; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .sub { font-size: 11px; color: #9E9C93; margin-bottom: 24px; }
  h2 { font-size: 13px; font-weight: 700; margin: 20px 0 8px; border-bottom: 2px solid #006D6B; padding-bottom: 4px; color: #006D6B; }
  h3 { font-size: 11px; font-weight: 700; margin: 12px 0 4px; color: #5C5A52; text-transform: uppercase; letter-spacing: .06em; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
  th { background: #F8F7F3; border: 1px solid #E5E2D9; padding: 5px 7px; font-weight: 700; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .05em; color: #9E9C93; }
  td { border: 1px solid #E5E2D9; padding: 4px 7px; }
  td.lbl { width: 40%; color: #5C5A52; }
  td.val { font-weight: 600; }
  tr:nth-child(even) td { background: #FAFAF8; }
  .empty { font-size: 11px; color: #9E9C93; margin-bottom: 12px; }
  footer { margin-top: 28px; font-size: 9px; color: #CCC9BF; text-align: center; border-top: 1px solid #E5E2D9; padding-top: 8px; }
  @media print {
    body { padding: 16px 20px; }
    h2 { page-break-before: always; }
    h2:first-of-type { page-break-before: avoid; }
    table { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1>${project.name}</h1>
  <p class="sub">Export generated ${new Date().toLocaleString("en-GB")} · ${ctx.org.name}</p>

  <h2>Project Overview</h2>
  <table>${Object.entries(projectInfo).map(([k, v]) => kvRow(k, v)).join("")}</table>

  <h2>EVM Metrics</h2>
  <table>${Object.entries(evmInfo).map(([k, v]) => kvRow(k, v)).join("")}</table>

  <h2>Features by Sprint</h2>
  ${tableSection("Tasks", featureRows)}

  <h2>Risk Register</h2>
  ${tableSection("Risks", riskRows)}

  <h2>Team Assignments</h2>
  ${tableSection("Team", teamRows)}

  <footer>RoadmapAI · ${project.name} · ${fmtDate(new Date())}</footer>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json({ error: "Unsupported format. Use csv, json, xlsx, or pdf" }, { status: 400 });
}
