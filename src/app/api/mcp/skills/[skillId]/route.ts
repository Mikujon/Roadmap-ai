import { withApiAuth } from "@/lib/api/route-handler";
import { getAllSkills } from "@/lib/skills";
import { runAgentLoop } from "@/lib/agent/loop";
import { db } from "@/lib/prisma";
import { ok, Errors } from "@/lib/api/response";
import { z } from "zod";

const SkillSchema = z.object({
  projectId:   z.string().optional(),
  context:     z.string().optional(),
  instruction: z.string().min(1),
});

export const POST = withApiAuth(async (req, ctx, params) => {
  const { skillId } = params;

  const skills = getAllSkills();
  const skill = skills.find(s => s.id === skillId);
  if (!skill) {
    return Errors.NOT_FOUND(`Skill '${skillId}' not found`);
  }

  let body: z.infer<typeof SkillSchema>;
  try {
    body = SkillSchema.parse(await req.json());
  } catch (e: unknown) {
    const ze = e as { flatten?: () => unknown; message?: string };
    return Errors.VALIDATION(ze.flatten?.() ?? ze.message);
  }

  const org = await db.organisation.findUnique({
    where:  { id: ctx.orgId },
    select: { name: true },
  });

  let projectName: string | undefined;
  if (body.projectId) {
    const project = await db.project.findFirst({
      where:  { id: body.projectId, organisationId: ctx.orgId },
      select: { name: true },
    });
    if (!project) return Errors.NOT_FOUND("Project not found");
    projectName = project.name;
  }

  const fullInstruction = [
    `Using the ${skill.name} skill:`,
    skill.description,
    body.context ? `Additional context: ${body.context}` : "",
    `Instruction: ${body.instruction}`,
  ].filter(Boolean).join("\n\n");

  const result = await runAgentLoop(
    fullInstruction,
    [],
    {
      orgId:       ctx.orgId,
      orgName:     org?.name ?? "Organisation",
      userId:      ctx.userId ?? "api-key",
      userRole:    "PMO",
      projectId:   body.projectId,
      projectName,
    },
  );

  return ok({
    skill:            skillId,
    skillName:        skill.name,
    analysis:         result.response,
    actionsPerformed: result.actionsPerformed,
    toolsUsed:        result.toolsUsed,
    iterations:       result.iterations,
    executedAt:       new Date().toISOString(),
  });
});
