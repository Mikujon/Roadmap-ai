import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  functionalAnalysis: z.string().min(10).max(10000),
  startDate: z.string(),
  endDate: z.string(),
});

export const UpdateFeatureSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  title: z.string().min(1).max(255).optional(),
  module: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "VIEWER"]).default("VIEWER"),
});