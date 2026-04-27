import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgs = await db.organisation.findMany({ where: { apiKey: null }, select: { id: true } });
  const updates = await Promise.all(
    orgs.map(org =>
      db.organisation.update({
        where: { id: org.id },
        data: { apiKey: `rmai_${nanoid(32)}` },
      })
    )
  );

  return NextResponse.json({ generated: updates.length });
}
