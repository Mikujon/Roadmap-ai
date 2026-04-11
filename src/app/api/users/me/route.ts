import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

const UpdateMeSchema = z.object({
  preferredView: z.enum(["PMO", "CEO", "STK", "DEV"]).optional(),
  name:          z.string().min(1).max(100).optional(),
});

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    id:            ctx.user.id,
    name:          ctx.user.name,
    email:         ctx.user.email,
    preferredView: ctx.user.preferredView ?? "PMO",
  });
}

export async function PATCH(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = UpdateMeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await db.user.update({
    where: { id: ctx.user.id },
    data:  parsed.data,
  });

  return NextResponse.json({ ok: true, preferredView: user.preferredView });
}
