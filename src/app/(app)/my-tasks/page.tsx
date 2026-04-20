export const dynamic = "force-dynamic";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import MyTasksClient from "./MyTasksClient";

export default async function MyTasksPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const features = await db.feature.findMany({
    where: {
      sprint: { project: { organisationId: ctx.org.id } },
      status: { notIn: ["DONE"] },
    },
    include: {
      sprint: {
        select: {
          id: true, name: true, status: true, endDate: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ priority: "asc" }, { order: "asc" }],
    take: 100,
  });

  return (
    <MyTasksClient
      features={features as any}
      userName={ctx.user.name ?? ""}
    />
  );
}
