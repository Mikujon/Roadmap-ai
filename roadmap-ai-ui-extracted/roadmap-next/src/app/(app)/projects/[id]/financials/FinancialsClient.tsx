"use client";
import { useState } from "react";
import Link from "next/link";
import { C, CARD, CARD_H, CARD_T, CARD_S, G4, G2, BTN, KpiCard, GuardianBar, DecItem, EvmRow, Row, Breadcrumb, useToast } from "@/components/ui/shared";
import { ModalBudgetUpdate, ModalExport } from "@/components/ui/project-modals";

export default function ProjectFinancialsClient({ projectId }: { projectId: string }) {
  const [showBudgetUpdate, setShowBudgetUpdate] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const { show: toast, ToastContainer } = useToast();

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Breadcrumb items={[{ label: "Customer Portal v2", onClick: () => window.history.back() }, { label: "Financials" }]} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Financials — EVM</h1>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>Live recalculation · PMI/PMBOK standard</p>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
          <Link href={`/projects/${projectId}`} style={{ ...BTN("sm"), textDecoration: "none" }}>← Overview</Link>
          <button style={BTN("sm")} onClick={() => setShowBudgetUpdate(true)}>Update budget</button>
          <button style={BTN("sm")} onClick={() => setShowExport(true)}>Export</button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={G4}>
        <KpiCard label="Budget (BAC)"     value="€380k" variant="default" />
        <KpiCard label="Spent (ACWP)"     value="€180k" sub="vs €176k planned"  variant="default" />
        <KpiCard label="Forecast (EAC)"   value="€373k" sub="−€7k under budget" variant="ok" />
        <KpiCard label="Margin"           value="€27k"  sub="expected revenue €400k" variant="ok" />
      </div>

      <div style={G2}>
        {/* EVM metrics */}
        <div style={CARD}>
          <div style={CARD_H}><span style={CARD_T}>EVM Metrics</span></div>
          <EvmRow label="SPI — Schedule Performance" abbr="schedule"  value="0.91"   status="warn"    />
          <EvmRow label="CPI — Cost Performance"     abbr="cost"      value="1.02"   status="ok"      />
          <EvmRow label="EAC — Estimate at Completion" abbr="forecast" value="€373k" status="neutral" />
          <EvmRow label="ETC — Estimate to Complete"  abbr="remaining" value="€193k" status="neutral" />
          <EvmRow label="VAC — Variance at Completion" abbr="variance" value="+€7k"  status="ok"      />
          <EvmRow label="TCPI — To-Complete PI"       abbr="index"     value="0.96"   status="ok"      />
          <EvmRow label="SV — Schedule Variance"      abbr="sched. var" value="−€14k" status="warn"   />
          <EvmRow label="CV — Cost Variance"          abbr="cost var"  value="+€3.6k" status="ok"     />
          <GuardianBar text="cost healthy · schedule is the only risk · no budget action needed" />
        </div>

        {/* Right column */}
        <div>
          {/* Budget breakdown */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Budget breakdown</span><button style={BTN("sm")} onClick={() => setShowBudgetUpdate(true)}>Edit</button></div>
            {[["Development — Team B","€220k"],["Design","€60k"],["QA / Testing","€40k"],["Infrastructure","€30k"],["Contingency","€30k"]].map(([label, val]) => (
              <Row key={label}>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.text }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: C.text }}>{val}</div>
              </Row>
            ))}
          </div>

          {/* AI insights */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>AI financial insights</span></div>
            <DecItem priority="good"  text="CPI >1.0 — producing more value than cost. Efficient budget consumption." />
            <DecItem priority="watch" text="SPI 0.91: if delay persists beyond May 1, EAC will exceed BAC." />
          </div>
        </div>
      </div>

      <ModalBudgetUpdate open={showBudgetUpdate} onClose={() => { setShowBudgetUpdate(false); toast("Budget update submitted","ok"); }} />
      <ModalExport       open={showExport}       onClose={() => { setShowExport(false);       toast("Export started…","ok"); }} />
      <ToastContainer />
    </div>
  );
}
