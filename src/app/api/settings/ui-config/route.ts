import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { can } from "@/lib/permissions";

const ALLOWED = [
  "uiTheme", "uiPrimaryColor", "uiLanguage", "uiCurrency",
  "uiDateFormat", "uiDefaultRole", "uiCompactMode",
  "brandColor", "logoUrl", "documentHeader", "documentFooter",
] as const;

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await db.organisation.findUnique({
    where: { id: ctx.org.id },
    select: {
      uiTheme: true,
      uiPrimaryColor: true,
      uiLanguage: true,
      uiCurrency: true,
      uiDateFormat: true,
      uiDefaultRole: true,
      uiCompactMode: true,
      brandColor: true,
      logoUrl: true,
      documentHeader: true,
      documentFooter: true,
    },
  });

  return NextResponse.json({ config: org });
}

export async function PATCH(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageSettings(ctx.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data = Object.fromEntries(
    Object.entries(body).filter(([k]) => (ALLOWED as readonly string[]).includes(k))
  );

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  await db.organisation.update({ where: { id: ctx.org.id }, data });
  return NextResponse.json({ ok: true });
}
