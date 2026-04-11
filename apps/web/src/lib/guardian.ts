import Anthropic from "@anthropic-ai/sdk";
import { calculateHealth } from "./health";


const anthropic = new Anthropic();

export interface GuardianAlert {
  id: string;
  level: "critical" | "warning" | "info" | "success";
  category: "schedule" | "budget" | "resources" | "scope" | "risk" | "progress" | "governance";
  title: string;
  detail: string;
  action?: string;
  projectId?: string;
  projectName?: string;
}

export interface GuardianProjectReport {
  projectId: string;
  projectName: string;
  healthScore: number;
  progressReal: number;        // AI-estimated real progress
  progressNominal: number;     // features done / total
  onTrackProbability: number;  // 0-100% chance of on-time delivery
  alerts: GuardianAlert[];
  recommendations: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  estimatedDelay: number;      // days
  budgetRisk: "none" | "low" | "medium" | "high";
  generatedAt: string;
}

export interface GuardianPortfolioReport {
  totalProjects: number;
  healthScore: number;
  criticalAlerts: GuardianAlert[];
  warningAlerts: GuardianAlert[];
  projectReports: GuardianProjectReport[];
  topRisks: string[];
  portfolioRecommendations: string[];
  generatedAt: string;
}

export interface ProjectInput {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  budgetTotal: number;
  revenueExpected: number;
  sprints: {
    id: string;
    num: string;
    name: string;
    status: string;
    startDate?: string | null;
    endDate?: string | null;
    features: {
      id: string;
      title: string;
      status: string;
      priority: string;
      estimatedHours: number;
      actualHours: number;
      module?: string;
    }[];
  }[];
  assignments: {
    estimatedHours: number;
    actualHours: number;
    resource: { name: string; role: string; costPerHour: number; capacityHours: number };
  }[];
  risks: { title: string; probability: number; impact: number; status: string }[];
  departments: { name: string }[];
}

// ── Calculate metrics without AI (fast) ────────────────────────────────────
export function calculateProjectMetrics(p: ProjectInput) {
  const allF       = p.sprints.flatMap(s => s.features);
  const done       = allF.filter(f => f.status === "DONE").length;
  const blocked    = allF.filter(f => f.status === "BLOCKED").length;
  const inProg     = allF.filter(f => f.status === "IN_PROGRESS").length;
  const total      = allF.length;
  const progressNominal = total > 0 ? Math.round((done / total) * 100) : 0;

  const now        = new Date();
  const start      = new Date(p.startDate);
  const end        = new Date(p.endDate);
  const totalDays  = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
  const elapsed    = Math.max(0, (now.getTime() - start.getTime()) / 86400000);
  const daysLeft   = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  const plannedPct = Math.min(100, Math.round((elapsed / totalDays) * 100));

  const costActual    = p.assignments.reduce((s, a) => s + a.actualHours * a.resource.costPerHour, 0);
  const costEstimated = p.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
  const budgetTotal   = p.budgetTotal || costEstimated;
  const costForecast  = progressNominal > 5 ? (costActual / progressNominal) * 100 : costEstimated;

  const completedSprints = p.sprints.filter(s => s.status === "DONE").length;
  const totalSprints     = p.sprints.length;
  const velocity         = completedSprints > 0 && elapsed > 0 ? completedSprints / elapsed : null;
  const remainingSprints = totalSprints - completedSprints;
  const forecastDays     = velocity ? elapsed + (remainingSprints / velocity) : totalDays;
  const estimatedDelay   = completedSprints === 0 ? 0 : Math.max(0, Math.round(forecastDays - totalDays));

  const openRisks  = p.risks.filter(r => r.status === "OPEN");
  const riskScore  = openRisks.reduce((s, r) => s + r.probability * r.impact, 0);
  const maxRisk    = openRisks.length > 0 ? Math.max(...openRisks.map(r => r.probability * r.impact)) : 0;

  const totalCap   = p.assignments.reduce((s, a) => s + a.resource.capacityHours, 0);
  const totalHours = p.assignments.reduce((s, a) => s + a.actualHours, 0);
  const utilization = totalCap > 0 ? Math.round((totalHours / totalCap) * 100) : 0;
  const highRisks = openRisks.filter(r => r.probability * r.impact >= 9);
  const inProgress = allF.filter(f => f.status === "IN_PROGRESS").length;
  const h = calculateHealth({
    startDate: p.startDate, endDate: p.endDate,
    totalFeatures: total, doneFeatures: done,
    blockedFeatures: blocked, inProgressFeatures: inProgress,
    totalSprints, doneSprints: completedSprints,
    activeSprints: p.sprints.filter(s => s.status === "ACTIVE").length,
    budgetTotal: p.budgetTotal, costActual, costEstimated,
    totalCapacityHours: totalCap, totalActualHours: totalHours,
    openRisks: openRisks.length, highRisks: highRisks.length, maxRiskScore: maxRisk,
  });
  const healthScore = h.healthScore;
  return {
    allF, done, blocked, inProg, total, progressNominal,
    now, start, end, totalDays, elapsed, daysLeft, plannedPct,
    costActual, costEstimated, budgetTotal, costForecast,
    completedSprints, totalSprints, velocity, estimatedDelay,
    openRisks, riskScore, maxRisk,
    utilization, totalCap, totalHours,
    scheduleGap: progressNominal - plannedPct,
    budgetDelta: costForecast - budgetTotal,
     healthScore,
  };
}

// ── AI Guardian Analysis ────────────────────────────────────────────────────
export async function analyzeProject(p: ProjectInput): Promise<GuardianProjectReport> {
  const m = calculateProjectMetrics(p);

  const prompt = `You are an AI PMO Guardian analyzing a project. Return ONLY valid JSON.

PROJECT DATA:
- Name: ${p.name}
- Start: ${p.startDate} | End: ${p.endDate}
- Days elapsed: ${Math.round(m.elapsed)} / ${Math.round(m.totalDays)} (${m.plannedPct}% of timeline)
- Days left: ${m.daysLeft}
- Features: ${m.done}/${m.total} done, ${m.blocked} blocked, ${m.inProg} in progress
- Nominal progress: ${m.progressNominal}%
- Schedule gap: ${m.scheduleGap > 0 ? "+" : ""}${m.scheduleGap}pp (progress vs planned timeline)
- Sprints: ${m.completedSprints}/${m.totalSprints} done
- Estimated delay: ${m.estimatedDelay} days
- Budget: ${m.budgetTotal > 0 ? `$${Math.round(m.budgetTotal)}` : "not set"}
- Cost actual: $${Math.round(m.costActual)} | Forecast: $${Math.round(m.costForecast)}
- Budget delta: ${m.budgetDelta > 0 ? "+" : ""}$${Math.round(m.budgetDelta)}
- Team utilization: ${m.utilization}%
- Open risks: ${m.openRisks.length} (max score: ${m.maxRisk})
- Blocked features: ${m.blocked}
- Description: ${p.description ?? "not provided"}

The project health score is ${m.healthScore}/100 (calculated by PMO formula based on schedule, budget, resources and risks). DO NOT change this score in your response. Your job is to explain WHY this score, provide context, and give actionable recommendations.
Based on ALL these factors, provide a comprehensive PMO governance analysis.

Respond with ONLY this JSON (no markdown):
{
  "healthScore": ${m.healthScore},
  "progressReal": <0-100 AI-estimated real progress considering all factors>,
  "onTrackProbability": <0-100>,
  "riskLevel": "low|medium|high|critical",
  "budgetRisk": "none|low|medium|high",
  "estimatedDelay": <days as integer>,
  "alerts": [
    {
      "id": "unique-id",
      "level": "critical|warning|info|success",
      "category": "schedule|budget|resources|scope|risk|progress|governance",
      "title": "Short alert title",
      "detail": "Detailed explanation with specific numbers",
      "action": "Concrete recommended action"
    }
  ],
  "recommendations": ["specific actionable recommendation 1", "recommendation 2", "recommendation 3"]
}

Rules:
- progressReal should differ from nominal when there are signs of hidden issues (blocked tasks, cost-progress incoherence, etc.)
- Generate 2-5 alerts covering the most important issues
- Always include at least 3 concrete recommendations
- Be specific with numbers, not vague
- If project is healthy, say so with a success alert`;

  try {
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (msg.content[0] as any).text.replace(/```json|```/gi, "").trim();
    const analysis = JSON.parse(raw);

    return {
      projectId: p.id,
      projectName: p.name,
      healthScore: m.healthScore,
      progressReal: analysis.progressReal,
      progressNominal: m.progressNominal,
      onTrackProbability: analysis.onTrackProbability,
      alerts: analysis.alerts.map((a: any) => ({ ...a, projectId: p.id, projectName: p.name })),
      recommendations: analysis.recommendations,
      riskLevel: analysis.riskLevel,
      estimatedDelay: analysis.estimatedDelay,
      budgetRisk: analysis.budgetRisk,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    // Fallback to rule-based analysis if AI fails
    return generateRuleBasedReport(p, m);
  }
}

// ── Rule-based fallback ─────────────────────────────────────────────────────
function generateRuleBasedReport(p: ProjectInput, m: ReturnType<typeof calculateProjectMetrics>): GuardianProjectReport {
  const alerts: GuardianAlert[] = [];

  if (m.estimatedDelay > 30)
    alerts.push({ id: "delay-critical", level: "critical", category: "schedule", title: "Severe delay risk", detail: `Forecast shows ${m.estimatedDelay} days delay based on current velocity`, action: "Escalate and review scope immediately" });
  else if (m.scheduleGap < -15)
    alerts.push({ id: "delay-warning", level: "warning", category: "schedule", title: "Behind schedule", detail: `Progress ${m.progressNominal}% vs planned ${m.plannedPct}%`, action: "Add resources or reduce scope" });

  if (m.budgetTotal > 0 && m.budgetDelta > m.budgetTotal * 0.1)
    alerts.push({ id: "budget-critical", level: "critical", category: "budget", title: "Budget overrun risk", detail: `Forecast $${Math.round(m.costForecast)} exceeds budget by $${Math.round(m.budgetDelta)}`, action: "Review resource allocation immediately" });

  if (m.blocked > 0)
    alerts.push({ id: "blocked", level: "warning", category: "progress", title: `${m.blocked} feature${m.blocked > 1 ? "s" : ""} blocked`, detail: "Blocked tasks are slowing sprint velocity", action: "Unblock dependencies in next standup" });

  if (m.utilization > 100)
    alerts.push({ id: "overload", level: "warning", category: "resources", title: "Team overloaded", detail: `Team at ${m.utilization}% capacity`, action: "Redistribute workload or extend timeline" });

  if (alerts.length === 0)
    alerts.push({ id: "healthy", level: "success", category: "governance", title: "Project is on track", detail: "No critical issues detected", action: "Continue monitoring" });

  return {
    projectId: p.id,
    projectName: p.name,
    healthScore: m.healthScore,
    progressReal: Math.max(0, m.progressNominal - (m.blocked * 3) - (m.scheduleGap < 0 ? Math.abs(m.scheduleGap) * 0.3 : 0)),
    progressNominal: m.progressNominal,
    onTrackProbability: Math.max(0, Math.min(100, 100 - (m.estimatedDelay * 2) - (m.blocked * 5))),
    alerts,
    recommendations: [
      m.blocked > 0 ? `Unblock ${m.blocked} blocked feature${m.blocked > 1 ? "s" : ""} to restore sprint velocity` : "Maintain current pace",
      m.scheduleGap < -10 ? "Consider scope reduction to meet deadline" : "Keep sprints on schedule",
      m.budgetDelta > 0 ? "Review resource cost allocation" : "Budget is under control",
    ],
    riskLevel: m.maxRisk >= 15 ? "critical" : m.maxRisk >= 8 ? "high" : m.maxRisk >= 4 ? "medium" : "low",
    estimatedDelay: m.estimatedDelay,
    budgetRisk: m.budgetTotal > 0 && m.budgetDelta > m.budgetTotal * 0.2 ? "high" : m.budgetDelta > 0 ? "medium" : "none",
    generatedAt: new Date().toISOString(),
  };
}

// ── Portfolio analysis ──────────────────────────────────────────────────────
export async function analyzePortfolio(projects: ProjectInput[]): Promise<GuardianPortfolioReport> {
  const reports = await Promise.all(projects.map(p => analyzeProject(p)));

  const allAlerts = reports.flatMap(r => r.alerts);
  const criticalAlerts = allAlerts.filter(a => a.level === "critical");
  const warningAlerts  = allAlerts.filter(a => a.level === "warning");

  const healthScore = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + r.healthScore, 0) / reports.length)
    : 100;

  return {
    totalProjects: projects.length,
    healthScore,
    criticalAlerts,
    warningAlerts,
    projectReports: reports,
    topRisks: criticalAlerts.slice(0, 3).map(a => `${a.projectName}: ${a.title}`),
    portfolioRecommendations: [
      criticalAlerts.length > 0 ? `Address ${criticalAlerts.length} critical issue${criticalAlerts.length > 1 ? "s" : ""} immediately` : "Portfolio is healthy",
      reports.filter(r => r.estimatedDelay > 0).length > 0 ? `${reports.filter(r => r.estimatedDelay > 0).length} project${reports.filter(r => r.estimatedDelay > 0).length > 1 ? "s" : ""} at risk of delay` : "All projects on schedule",
    ],
    generatedAt: new Date().toISOString(),
  };
}
