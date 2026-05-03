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

export type { Skill, AgentContext, AgentResult };
