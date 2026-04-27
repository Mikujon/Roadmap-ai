import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function POST() {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 400 });

  await db.organisation.update({
    where: { clerkOrgId: orgId },
    data:  { onboardingCompleted: true },
  });

  return NextResponse.json({ ok: true });
}
