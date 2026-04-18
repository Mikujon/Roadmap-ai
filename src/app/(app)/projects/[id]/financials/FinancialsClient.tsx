"use client";
import { useState } from "react";
import Link from "next/link";
import { C, CARD, CARD_H, CARD_T, CARD_S, G4, G2, BTN, KpiCard, GuardianBar, DecItem, EvmRow, useToast } from "@/components/ui/shared";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ModalBudgetUpdate, ModalExport } from "@/components/ui/project-modals";
import { ProjectChat, ChatButton } from "@/components/ui/project-chat";

type HealthStatus = "OFF_TRACK" | "AT_RISK" | "ON_TRACK" | "COMPLETED" | "NOT_STARTED";

interface EvmData {
  bac: number; acwp: number; bcwp: number; pv: number;
  spi: number; cpi: number; eac: number; etc: number;
  vac: number; tcpi: number; sv: number; cv: number;
}
interface Props {
  projectId: string; projectName: string;
  evm: EvmData;
  progress: number;
  budgetTotal: number; costActual: number; costForecast: number;
  revenueExpected: number; marginEur: number;
  healthStatus: HealthStatus;
  alerts: any[];
}

function fmtC(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function ProjectFinancialsClient({ projectId, projectName, evm, progress, budgetTotal, costActual, costForecast, revenueExpected, marginEur, healthStatus, alerts }: Props) {
  const [showBudgetUpdate, setShowBudgetUpdate] = useState(false);
  const [showExport, setShowExport]             = useState(false);
  const [chatOpen, setChatOpen]                 = useState(false);
  const { show: toast, ToastContainer }         = useToast();

  const vac       = evm.vac;
  const vacStr    = vac >= 0 ? `+${fmtC(vac)}` : fmtC(vac);
  const svStr     = evm.sv >= 0 ? `+${fmtC(evm.sv)}` : fmtC(evm.sv);
  const cvStr     = evm.cv >= 0 ? `+${fmtC(evm.cv)}` : fmtC(evm.cv);

  const criticalAlert = alerts.find((a: any) => a.level === "critical");
  const warnAlert     = alerts.find((a: any) => a.level === "warning");
  const goodAlert     = alerts.find((a: any) => a.level === "success");

  const eacVariant: "ok"|"warn"|"bad" = costForecast > budgetTotal * 1.1 ? "bad" : costForecast > budgetTotal ? "warn" : "ok";
  const marginVariant: "ok"|"warn"|"bad" = marginEur >= 0 ? "ok" : "bad";

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Breadcrumb items={[{ label: "Portfolio", href: "/portfolio" }, { label: projectName, href: `/projects/${projectId}` }, { label: "Financials" }]} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Financials — EVM</h1>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>Live recalculation · PMI/PMBOK standard</p>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
          <Link href={`/projects/${projectId}`} style={{ ...BTN("sm"), textDecoration: "none" }}>← Overview</Link>
          <button style={BTN("sm")} onClick={() => setShowBudgetUpdate(true)}>Update budget</button>
          <button style={BTN("sm")} onClick={() => setShowExport(true)}>Export</button>
          <ChatButton onClick={() => setChatOpen(true)} />
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={G4}>
        <KpiCard label="Budget (BAC)"   value={fmtC(evm.bac)}   variant="default" />
        <KpiCard
          label="Spent (ACWP)"
          value={fmtC(evm.acwp)}
          sub={evm.pv > 0 ? `vs ${fmtC(evm.pv)} planned` : undefined}
          variant="default"
        />
        <KpiCard
          label="Forecast (EAC)"
          value={fmtC(evm.eac)}
          sub={vac >= 0 ? `${vacStr} under budget` : `${fmtC(Math.abs(vac))} over budget`}
          variant={eacVariant === "bad" ? "warn" : eacVariant}
        />
        <KpiCard
          label="Margin"
          value={revenueExpected > 0 ? fmtC(marginEur) : "—"}
          sub={revenueExpected > 0 ? `revenue ${fmtC(revenueExpected)}` : "no revenue set"}
          variant={marginVariant === "bad" ? "warn" : marginVariant}
        />
      </div>

      <div style={G2}>
        {/* EVM metrics */}
        <div style={CARD}>
          <div style={CARD_H}><span style={CARD_T}>EVM Metrics</span></div>
          <EvmRow label="SPI — Schedule Performance"    abbr="schedule"    value={evm.spi.toFixed(2)} status={evm.spi >= 0.95 ? "ok" : evm.spi >= 0.8 ? "warn" : "bad"} />
          <EvmRow label="CPI — Cost Performance"        abbr="cost"        value={evm.cpi.toFixed(2)} status={evm.cpi >= 0.95 ? "ok" : evm.cpi >= 0.8 ? "warn" : "bad"} />
          <EvmRow label="EAC — Estimate at Completion"  abbr="forecast"    value={fmtC(evm.eac)}      status={eacVariant === "bad" ? "bad" : eacVariant} />
          <EvmRow label="ETC — Estimate to Complete"    abbr="remaining"   value={fmtC(evm.etc)}      status="neutral" />
          <EvmRow label="VAC — Variance at Completion"  abbr="variance"    value={vacStr}             status={vac >= 0 ? "ok" : "warn"} />
          <EvmRow label="TCPI — To-Complete PI"         abbr="index"       value={evm.tcpi.toFixed(2)} status={evm.tcpi <= 1.1 ? "ok" : "warn"} />
          <EvmRow label="SV — Schedule Variance"        abbr="sched. var"  value={svStr}              status={evm.sv >= 0 ? "ok" : "warn"} />
          <EvmRow label="CV — Cost Variance"            abbr="cost var"    value={cvStr}              status={evm.cv >= 0 ? "ok" : "warn"} />
          <GuardianBar text={
            criticalAlert
              ? criticalAlert.detail ?? criticalAlert.title
              : warnAlert
                ? warnAlert.detail ?? warnAlert.title
                : "cost and schedule healthy · continue monitoring"
          } />
        </div>

        {/* Right column */}
        <div>
          {/* Budget summary */}
          <div style={CARD}>
            <div style={CARD_H}>
              <span style={CARD_T}>Budget summary</span>
              <button style={BTN("sm")} onClick={() => setShowBudgetUpdate(true)}>Edit</button>
            </div>
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "BAC (Budget)",    val: fmtC(evm.bac),  color: C.text   },
                { label: "ACWP (Actual)",   val: fmtC(evm.acwp), color: C.green  },
                { label: "BCWP (Earned)",   val: fmtC(evm.bcwp), color: C.blue   },
                { label: "EAC (Forecast)",  val: fmtC(evm.eac),  color: evm.eac > evm.bac && evm.bac > 0 ? C.red : C.text },
                ...(revenueExpected > 0 ? [{ label: "Revenue", val: fmtC(revenueExpected), color: C.blue }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.text2 }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: row.color }}>{row.val}</span>
                </div>
              ))}
              {/* Progress bar */}
              <div>
                <div style={{ height: 5, background: C.surface2, borderRadius: 99, overflow: "hidden", marginTop: 4 }}>
                  <div style={{ height: "100%", width: `${Math.min(progress, 100)}%`, background: C.guardian, borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 4 }}>{progress}% complete</div>
              </div>
            </div>
          </div>

          {/* AI insights */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>AI financial insights</span></div>
            {criticalAlert && <DecItem priority="urgent" text={criticalAlert.detail ?? criticalAlert.title} />}
            {warnAlert     && <DecItem priority="watch"  text={warnAlert.detail     ?? warnAlert.title}     />}
            {!criticalAlert && !warnAlert && (
              <DecItem priority="good" text={`CPI ${evm.cpi.toFixed(2)} · SPI ${evm.spi.toFixed(2)} · financial performance within normal range.`} />
            )}
          </div>
        </div>
      </div>

      <ModalBudgetUpdate open={showBudgetUpdate} onClose={() => { setShowBudgetUpdate(false); toast("Budget update submitted", "ok"); }} />
      <ModalExport       open={showExport}       onClose={() => setShowExport(false)} projectId={projectId} />
      <ToastContainer />
      <ProjectChat open={chatOpen} onClose={() => setChatOpen(false)} projectId={projectId} projectName={projectName} teamMembers={[]} />
    </div>
  );
}
