import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({ action: z.enum(["approve", "reject"]) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const alert = await db.alert.findFirst({
    where: { id, organisationId: ctx.org.id },
  });
  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.alert.update({
    where: { id },
    data:  {
      validatedBy:  ctx.user.name ?? ctx.user.email,
      validatedAt:  new Date(),
      resolved:     parsed.data.action === "approve",
      read:         true,
      requiresValidation: false,
    },
  });

  return NextResponse.json({ ok: true, action: parsed.data.action });
}
