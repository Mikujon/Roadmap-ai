import { Role } from "@prisma/client";

export const can = {
  // Projects
  createProject:    (role: Role) => role === "ADMIN" || role === "PMO",
  editProject:      (role: Role) => role === "ADMIN" || role === "PMO",
  deleteProject:    (role: Role) => role === "ADMIN",

  // Features & Sprints
  editFeature:      (role: Role) => role === "ADMIN" || role === "PMO",
  editSprint:       (role: Role) => role === "ADMIN" || role === "PMO",

  // Financial
  editFinancials:   (role: Role) => role === "ADMIN" || role === "PMO",
  viewFinancials:   (_role: Role) => true,

  // Risks
  editRisks:        (role: Role) => role === "ADMIN" || role === "PMO",

  // Resources
  editResources:    (role: Role) => role === "ADMIN",

  // Dependencies
  editDependencies: (role: Role) => role === "ADMIN" || role === "PMO",

  // Team
  inviteMembers:    (role: Role) => role === "ADMIN" || role === "PMO",
  removeMembers:    (role: Role) => role === "ADMIN",

  // Billing
  viewBilling:      (role: Role) => role === "ADMIN" || role === "CEO",
  editBilling:      (role: Role) => role === "ADMIN",

  // Share
  shareProject:     (role: Role) => role === "ADMIN" || role === "PMO",
};
