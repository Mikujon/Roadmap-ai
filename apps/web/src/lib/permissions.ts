import { Role } from "@prisma/client";

export const can = {
  // Projects
  createProject:    (role: Role) => role === Role.ADMIN || role === Role.MANAGER,
  editProject:      (role: Role) => role === Role.ADMIN || role === Role.MANAGER,
  deleteProject:    (role: Role) => role === Role.ADMIN,

  // Features & Sprints
  editFeature:      (role: Role) => role === Role.ADMIN || role === Role.MANAGER,
  editSprint:       (role: Role) => role === Role.ADMIN || role === Role.MANAGER,

  // Financial
  editFinancials:   (role: Role) => role === Role.ADMIN || role === Role.MANAGER,
  viewFinancials:   (role: Role) => true,

  // Risks
  editRisks:        (role: Role) => role === Role.ADMIN || role === Role.MANAGER,

  // Resources
  editResources:    (role: Role) => role === Role.ADMIN,

  // Dependencies
  editDependencies: (role: Role) => role === Role.ADMIN || role === Role.MANAGER,

  // Team
  inviteMembers:    (role: Role) => role === Role.ADMIN,
  removeMembers:    (role: Role) => role === Role.ADMIN,

  // Billing
  viewBilling:      (role: Role) => role === Role.ADMIN,
  editBilling:      (role: Role) => role === Role.ADMIN,

  // Share
  shareProject:     (role: Role) => role === Role.ADMIN || role === Role.MANAGER,
};