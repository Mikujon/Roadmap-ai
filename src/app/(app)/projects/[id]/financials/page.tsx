import { getAuthContext } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { getProjectMetrics } from "@/lib/metrics";
import ProjectFinancialsClient from "./FinancialsClient";

export default async function FinancialsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    include: {
      sprints: { include: { features: true } },
      risks: true,
      assignments: { include: { resource: true } },
      requestedBy: { select: { name: true, email: true } },
      departments: { include: { department: true } },
    },
  });

  if (!project) notFound();

  const m = getProjectMetrics(project as any);

  return (
    <ProjectFinancialsClient
      projectId={id}
      projectName={project.name}
      evm={{
        bac:  m.health.bac,
        acwp: m.health.ac,
        bcwp: m.health.ev,
        pv:   m.health.pv,
        spi:  m.health.spi,
        cpi:  m.health.cpi,
        eac:  m.health.eac,
        etc:  m.health.etc,
        vac:  m.health.vac,
        tcpi: m.health.tcpi,
        sv:   m.health.sv,
        cv:   m.health.cv,
      }}
      progress={m.health.progressNominal}
      budgetTotal={m.budgetTotal}
      costActual={m.costActual}
      costForecast={m.costForecast}
      revenueExpected={m.revenueExpected}
      marginEur={m.marginEur}
      healthStatus={m.health.status}
      alerts={m.health.alerts as any[]}
    />
  );
}
