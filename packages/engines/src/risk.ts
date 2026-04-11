// ── Risk Engine ───────────────────────────────────────────────────────────────
// Pure functions for risk scoring, matrix classification, and prioritization.

export type RiskSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface RiskInput {
  probability: number; // 1-5
  impact:      number; // 1-5
  status:      string;
}

export interface RiskScore {
  score:    number;       // probability * impact (1-25)
  severity: RiskSeverity;
  color:    string;
  bg:       string;
  label:    string;
}

/** Compute P×I score and severity classification */
export function scoreRisk(risk: RiskInput): RiskScore {
  const score = risk.probability * risk.impact;
  return {
    score,
    ...classifyRiskScore(score),
  };
}

/** Classify a raw P×I score */
export function classifyRiskScore(score: number): Omit<RiskScore, "score"> {
  if (score >= 15) return { severity: "CRITICAL", color: "#DC2626", bg: "#FEF2F2", label: "Critical" };
  if (score >= 8)  return { severity: "HIGH",     color: "#EA580C", bg: "#FFF7ED", label: "High"     };
  if (score >= 4)  return { severity: "MEDIUM",   color: "#D97706", bg: "#FFFBEB", label: "Medium"   };
  return             { severity: "LOW",      color: "#059669", bg: "#ECFDF5", label: "Low"     };
}

/** Sort risks by score descending (highest first) */
export function sortRisksByScore<T extends RiskInput>(risks: T[]): T[] {
  return [...risks].sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact));
}

/** Count risks by severity for a given set */
export function countRisksBySeverity(risks: RiskInput[]) {
  const open = risks.filter(r => r.status === "OPEN");
  return {
    critical:  open.filter(r => r.probability * r.impact >= 15).length,
    high:      open.filter(r => r.probability * r.impact >= 8  && r.probability * r.impact < 15).length,
    medium:    open.filter(r => r.probability * r.impact >= 4  && r.probability * r.impact < 8).length,
    low:       open.filter(r => r.probability * r.impact < 4).length,
    mitigated: risks.filter(r => r.status === "MITIGATED").length,
    total:     risks.length,
    openTotal: open.length,
    maxScore:  open.length > 0 ? Math.max(...open.map(r => r.probability * r.impact)) : 0,
  };
}

/** Check if a project has any unacceptable risks (critical or high unmitigated) */
export function hasUnacceptableRisk(risks: RiskInput[]): boolean {
  return risks.some(r => r.status === "OPEN" && r.probability * r.impact >= 9);
}
