import { z } from "zod";

// ── Base schemas ──────────────────────────────────────────────────────────────

export const FeatureStatusSchema  = z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]);
export const FeaturePrioritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export const SprintStatusSchema   = z.enum(["UPCOMING", "ACTIVE", "DONE"]);
export const ProjectStatusSchema  = z.enum(["NOT_STARTED", "ACTIVE", "PAUSED", "COMPLETED", "CLOSED", "ARCHIVED"]);
export const MemberRoleSchema     = z.enum(["ADMIN", "MANAGER", "VIEWER"]);
export const AlertLevelSchema     = z.enum(["critical", "warning", "info", "success"]);
export const AlertCategorySchema  = z.enum(["schedule", "budget", "resources", "scope", "risk", "progress", "governance"]);
export const RiskLevelSchema      = z.enum(["low", "medium", "high", "critical"]);
export const BudgetRiskSchema     = z.enum(["none", "low", "medium", "high", "critical"]);

// ── Health Engine I/O schemas ─────────────────────────────────────────────────

export const HealthInputSchema = z.object({
  startDate:          z.union([z.date(), z.string()]),
  endDate:            z.union([z.date(), z.string()]),
  totalFeatures:      z.number().int().min(0),
  doneFeatures:       z.number().int().min(0),
  blockedFeatures:    z.number().int().min(0),
  inProgressFeatures: z.number().int().min(0),
  totalSprints:       z.number().int().min(0),
  doneSprints:        z.number().int().min(0),
  activeSprints:      z.number().int().min(0),
  budgetTotal:        z.number().min(0),
  costActual:         z.number().min(0),
  costEstimated:      z.number().min(0),
  totalCapacityHours: z.number().min(0),
  totalActualHours:   z.number().min(0),
  openRisks:          z.number().int().min(0),
  highRisks:          z.number().int().min(0),
  maxRiskScore:       z.number().min(0),
});

export const HealthAlertSchema = z.object({
  id:       z.string(),
  level:    AlertLevelSchema,
  category: AlertCategorySchema,
  title:    z.string(),
  detail:   z.string(),
  action:   z.string(),
  impact:   z.enum(["high", "medium", "low"]),
});

// ── Guardian output schemas ────────────────────────────────────────────────────

export const GuardianAlertSchema = z.object({
  id:          z.string(),
  level:       AlertLevelSchema,
  category:    AlertCategorySchema,
  title:       z.string().max(120),
  detail:      z.string().max(400),
  action:      z.string().max(200).optional(),
  projectId:   z.string().optional(),
  projectName: z.string().optional(),
});

export const GuardianProjectReportSchema = z.object({
  projectId:          z.string(),
  projectName:        z.string(),
  healthScore:        z.number().int().min(0).max(100),
  progressReal:       z.number().min(0).max(100),
  progressNominal:    z.number().min(0).max(100),
  onTrackProbability: z.number().int().min(0).max(100),
  alerts:             z.array(GuardianAlertSchema),
  recommendations:    z.array(z.string().max(300)).min(1).max(5),
  riskLevel:          RiskLevelSchema,
  estimatedDelay:     z.number().int().min(0),
  budgetRisk:         BudgetRiskSchema,
  summary:            z.string().max(300).optional(),
  generatedAt:        z.string().datetime(),
});

// ── AI output schemas (structured outputs) ────────────────────────────────────

export const GuardianAIOutputSchema = z.object({
  healthScore:        z.number().int().min(0).max(100),
  progressReal:       z.number().min(0).max(100),
  onTrackProbability: z.number().int().min(0).max(100),
  riskLevel:          RiskLevelSchema,
  budgetRisk:         BudgetRiskSchema,
  estimatedDelay:     z.number().int().min(0),
  summary:            z.string().max(300),
  alerts:             z.array(GuardianAlertSchema).min(1).max(5),
  recommendations:    z.array(z.string().max(300)).min(3).max(5),
});

export const DecisionInsightSchema = z.object({
  id:      z.string(),
  insight: z.string().max(150),
});

export const DecisionInsightsOutputSchema = z.object({
  results: z.array(DecisionInsightSchema),
});

// ── Project engine input schema ───────────────────────────────────────────────

export const FeatureEngineSchema = z.object({
  id:             z.string(),
  title:          z.string(),
  status:         FeatureStatusSchema,
  priority:       FeaturePrioritySchema,
  estimatedHours: z.number().min(0),
  actualHours:    z.number().min(0),
  module:         z.string().optional(),
  dependsOn:      z.array(z.object({ id: z.string(), dependsOnId: z.string() })),
});

export const SprintEngineSchema = z.object({
  id:        z.string(),
  num:       z.string(),
  name:      z.string(),
  status:    SprintStatusSchema,
  startDate: z.string().nullable(),
  endDate:   z.string().nullable(),
  features:  z.array(FeatureEngineSchema),
});

export const ProjectEngineInputSchema = z.object({
  id:              z.string(),
  name:            z.string(),
  description:     z.string().optional(),
  startDate:       z.string(),
  endDate:         z.string(),
  budgetTotal:     z.number().min(0),
  revenueExpected: z.number().min(0),
  status:          ProjectStatusSchema,
  sprints:         z.array(SprintEngineSchema),
  assignments: z.array(z.object({
    estimatedHours: z.number().min(0),
    actualHours:    z.number().min(0),
    resource: z.object({
      name:          z.string(),
      role:          z.string(),
      costPerHour:   z.number().min(0),
      capacityHours: z.number().min(0),
    }),
  })),
  risks: z.array(z.object({
    title:       z.string(),
    probability: z.number().int().min(1).max(5),
    impact:      z.number().int().min(1).max(5),
    status:      z.string(),
    mitigation:  z.string().optional(),
  })),
  departments: z.array(z.object({ name: z.string() })),
});

// ── Inferred types ────────────────────────────────────────────────────────────
export type HealthInputZ            = z.infer<typeof HealthInputSchema>;
export type HealthAlertZ            = z.infer<typeof HealthAlertSchema>;
export type GuardianAlertZ          = z.infer<typeof GuardianAlertSchema>;
export type GuardianProjectReportZ  = z.infer<typeof GuardianProjectReportSchema>;
export type GuardianAIOutputZ       = z.infer<typeof GuardianAIOutputSchema>;
export type ProjectEngineInputZ     = z.infer<typeof ProjectEngineInputSchema>;
export type DecisionInsightZ        = z.infer<typeof DecisionInsightSchema>;
