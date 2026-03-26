import { Role } from "@prisma/client";

export const can = {
  createProject: (role: Role) =>
    role === Role.ADMIN || role === Role.MANAGER,
  editProject: (role: Role) =>
    role === Role.ADMIN || role === Role.MANAGER,
  deleteProject: (role: Role) =>
    role === Role.ADMIN,
  editFeature: (role: Role) =>
    role === Role.ADMIN || role === Role.MANAGER,
  inviteMembers: (role: Role) =>
    role === Role.ADMIN,
  manageMembers: (role: Role) =>
    role === Role.ADMIN,
  manageBilling: (role: Role) =>
    role === Role.ADMIN,
};