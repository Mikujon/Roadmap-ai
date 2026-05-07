import type { Skill, AgentContext, AgentResult } from "./types";

import { dependencySkill,  runDependencyAgent  } from "./dependency-skill";
import { forecastSkill,    runForecastAgent     } from "./forecast-skill";
import { reportSkill,      runReportAgent       } from "./report-skill";
import { methodologySkill, runMethodologyAgent  } from "./methodology-skill";

type SkillEntry = {
  skill: Skill;
  run:   (ctx: AgentContext) => Promise<AgentResult>;
};

export const skillsRegistry = new Map<string, SkillEntry>([
  ["dependency-skill",  { skill: dependencySkill,  run: runDependencyAgent  }],
  ["forecast-skill",    { skill: forecastSkill,     run: runForecastAgent    }],
  ["report-skill",      { skill: reportSkill,       run: runReportAgent      }],
  ["methodology-skill", { skill: methodologySkill,  run: runMethodologyAgent }],
]);

// Skills without a full agent implementation — metadata only
const EXTRA_SKILLS: Skill[] = [
  {
    id:          "evm-skill",
    name:        "EVM Analyst",
    description: "Calculates Earned Value Management metrics (SPI, CPI, EAC, ETC, VAC) and interprets schedule and cost performance.",
    version:     "1.0.0",
    triggers:    ["feature_updated", "budget_updated", "daily_sweep"],
  },
  {
    id:          "risk-skill",
    name:        "Risk Manager",
    description: "Identifies, scores, and creates mitigations for project risks. Monitors risk register and suggests prioritised actions.",
    version:     "1.0.0",
    triggers:    ["risk_added", "feature_blocked", "daily_sweep"],
  },
  {
    id:          "knowledge-skill",
    name:        "Knowledge Search",
    description: "Searches the knowledge graph for past decisions, context, and related events across the organisation.",
    version:     "1.0.0",
    triggers:    ["message_received"],
  },
];

export function getAllSkills(): Skill[] {
  const registry = Array.from(skillsRegistry.values()).map(e => e.skill);
  return [...EXTRA_SKILLS, ...registry];
}

export type { Skill, AgentContext, AgentResult };
