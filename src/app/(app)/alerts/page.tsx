export const dynamic = "force-dynamic";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import AlertsClient from "./AlertsClient";

export default async function AlertsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const alerts = await db.alert.findMany({
    where: { organisationId: ctx.org.id },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Mark all as read on page visit
  await db.alert.updateMany({
    where: { organisationId: ctx.org.id, read: false },
    data: { read: true },
  });

  return <AlertsClient alerts={alerts as any} />;
}
