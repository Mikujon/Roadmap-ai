import { Role } from "@prisma/client";

export type { Role };

export const can = {
  // Projects
  createProject:      (r: Role) => r === "ADMIN" || r === "PMO",
  editProject:        (r: Role) => r === "ADMIN" || r === "PMO",
  deleteProject:      (r: Role) => r === "ADMIN",
  viewAllProjects:    (r: Role) => r === "ADMIN" || r === "PMO" || r === "CEO",
  viewOwnProjects:    (_r: Role) => true,

  // Financial
  viewFinancials:     (r: Role) => r === "ADMIN" || r === "PMO" || r === "CEO",
  editFinancials:     (r: Role) => r === "ADMIN" || r === "PMO",
  editBudget:         (r: Role) => r === "ADMIN" || r === "PMO",
  approveBudget:      (r: Role) => r === "ADMIN" || r === "CEO",

  // Sprint & tasks
  manageSprints:      (r: Role) => r === "ADMIN" || r === "PMO",
  updateTaskStatus:   (r: Role) => r === "ADMIN" || r === "PMO" || r === "DEV",
  createTask:         (r: Role) => r === "ADMIN" || r === "PMO",
  editFeature:        (r: Role) => r === "ADMIN" || r === "PMO",
  editSprint:         (r: Role) => r === "ADMIN" || r === "PMO",
  viewBoard:          (r: Role) => r === "ADMIN" || r === "PMO" || r === "DEV",

  // Risks
  createRisk:         (r: Role) => r === "ADMIN" || r === "PMO",
  editRisks:          (r: Role) => r === "ADMIN" || r === "PMO",
  viewRisks:          (r: Role) => r === "ADMIN" || r === "PMO" || r === "CEO",

  // Governance & documents
  approveScope:       (r: Role) => r === "ADMIN" || r === "CEO" || r === "PMO",
  viewGovernance:     (r: Role) => r === "ADMIN" || r === "PMO" || r === "CEO",
  viewDocuments:      (_r: Role) => true,
  editDocuments:      (r: Role) => r === "ADMIN" || r === "PMO",
  approveDocuments:   (r: Role) => r === "ADMIN" || r === "CEO" || r === "PMO",

  // Resources & dependencies
  editResources:      (r: Role) => r === "ADMIN",
  editDependencies:   (r: Role) => r === "ADMIN" || r === "PMO",

  // Team management
  inviteMembers:      (r: Role) => r === "ADMIN" || r === "PMO",
  removeMembers:      (r: Role) => r === "ADMIN",
  manageRoles:        (r: Role) => r === "ADMIN",

  // Settings / billing
  manageSettings:     (r: Role) => r === "ADMIN",
  viewBilling:        (r: Role) => r === "ADMIN" || r === "CEO",
  editBilling:        (r: Role) => r === "ADMIN",
  manageIntegrations: (r: Role) => r === "ADMIN" || r === "PMO",

  // Sharing
  shareProject:       (r: Role) => r === "ADMIN" || r === "PMO",
};

// What each role sees in the dashboard
export const dashboardConfig = {
  PMO: {
    showDecisionsFeed:  true,
    showAllProjects:    true,
    showFinancials:     true,
    showTeamManagement: true,
    showGuardianFull:   true,
  },
  CEO: {
    showPortfolioKPIs:      true,
    showBudgetExposure:     true,
    showStrategicDecisions: true,
    showRevenueVsCost:      true,
    showAllProjects:        true,
    showFinancials:         true,
  },
  STAKEHOLDER: {
    showOwnProjectsOnly: true,
    showMilestones:      true,
    showDocuments:       true,
    showBudgetSummary:   false,
  },
  DEV: {
    showMyTasksOnly:    true,
    showSprintProgress: true,
    showBlockedTasks:   true,
    showFinancials:     false,
  },
  ADMIN: {
    showEverything: true,
  },
} as const;

// Sidebar route keys per role
export const sidebarItems: Record<Role, string[]> = {
  PMO: [
    "dashboard", "portfolio", "cost", "alerts",
    "archive", "roadmap",
    "settings/team", "settings/integrations",
    "settings/billing", "settings",
  ],
  CEO: [
    "dashboard", "portfolio", "cost", "alerts",
    "archive", "roadmap", "settings",
  ],
  STAKEHOLDER: [
    "dashboard", "alerts", "roadmap",
  ],
  DEV: [
    "dashboard", "my-tasks", "alerts",
  ],
  ADMIN: [
    "dashboard", "portfolio", "cost", "alerts",
    "archive", "roadmap",
    "settings/team", "settings/integrations",
    "settings/billing", "settings/departments", "settings",
  ],
};

// Project detail tabs per role
export const projectTabs: Record<Role, string[]> = {
  PMO:         ["Overview", "Board", "Backlog", "Risks", "Financials", "Governance", "FA", "Docs", "Chat"],
  CEO:         ["Overview", "Financials", "Governance"],
  STAKEHOLDER: ["Overview", "Docs", "FA"],
  DEV:         ["Overview", "Board", "Chat"],
  ADMIN:       ["Overview", "Board", "Backlog", "Risks", "Financials", "Governance", "FA", "Docs", "Chat"],
};
