"use client";

import { useState } from "react";
import type { FinancialCompanyData, FinancialCompanyError, FinancialCompanyResult } from "@/app/api/industries/financials/route";

type Tab = "pl" | "bs" | "cf" | "val";

const TABS: { id: Tab; label: string }[] = [
  { id: "pl",  label: "P&L" },
  { id: "bs",  label: "Balance Sheet" },
  { id: "cf",  label: "Cash Flow" },
  { id: "val", label: "Valuation" },
];

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtAbs(val: number | null | undefined, currency: string): string {
  if (val == null) return "—";
  if (currency === "INR_CR") {
    if (Math.abs(val) >= 100_000) return `₹${(val / 100_000).toFixed(2)}L Cr`;
    if (Math.abs(val) >= 1_000)   return `₹${(val / 1_000).toFixed(1)}K Cr`;
    return `₹${val.toFixed(0)} Cr`;
  }
  if (currency === "USD_M") {
    if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(2)}B`;
    return `$${val.toFixed(0)}M`;
  }
  return val.toFixed(0);
}
const fmtPct = (v: number | null | undefined) => v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtMult = (v: number | null | undefined, s = "x") => v == null ? "—" : `${v.toFixed(1)}${s}`;
const fmtEPS  = (v: number | null | undefined, cur: string) =>
  v == null ? "—" : `${cur === "INR_CR" ? "₹" : "$"}${v.toFixed(2)}`;
const margin  = (n: number | null | undefined, d: number | null | undefined) =>
  n == null || d == null || d === 0 ? "—" : `${((n / d) * 100).toFixed(1)}%`;
const fcf     = (ocf: number | null | undefined, capex: number | null | undefined) =>
  ocf == null ? undefined : ocf - Math.abs(capex ?? 0);
const yoy     = (cur: number | null | undefined, prev: number | null | undefined) =>
  cur == null || prev == null || prev === 0 ? "—"
  : `${(((cur - prev) / Math.abs(prev)) * 100).toFixed(1)}%`;

// ─── Per-company colour accents ───────────────────────────────────────────────

const PALETTE = [
  { topBorder: "border-t-[4px] border-t-indigo-400", divider: "" },
  { topBorder: "border-t-[4px] border-t-violet-400", divider: "border-l border-slate-600" },
  { topBorder: "border-t-[4px] border-t-sky-400",    divider: "border-l border-slate-600" },
];

// ─── Row component ────────────────────────────────────────────────────────────

function Row({
  label, hint, values, growth, bold, indent,
}: {
  label: string; hint?: string; values: (string | undefined)[];
  growth?: boolean; bold?: boolean; indent?: boolean;
}) {
  return (
    <tr className={`border-t transition-colors hover:bg-muted/20 ${bold ? "border-border bg-muted/10" : "border-border/30"}`}>
      <td className={`w-48 py-2.5 pr-3 text-xs ${indent ? "pl-7" : "pl-4"} ${bold ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>
        {label}
        {hint ? <span className="ml-1 text-[10px] font-normal opacity-50">{hint}</span> : null}
      </td>
      {values.map((v, i) => {
        let cls = bold ? "font-semibold text-foreground" : "text-foreground";
        if (growth && v && v !== "—") {
          const n = parseFloat(v);
          if (!isNaN(n)) cls = n > 0 ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold text-rose-500 dark:text-rose-400";
        }
        return (
          <td key={i} className={`px-3 py-2.5 text-right text-xs tabular-nums ${cls}`}>
            {v ?? "—"}
          </td>
        );
      })}
    </tr>
  );
}

function isError(c: FinancialCompanyResult): c is FinancialCompanyError {
  return "error" in c && typeof (c as FinancialCompanyError).error === "string";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FinancialComparison({ companies }: { companies: FinancialCompanyResult[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("pl");

  const ok   = companies.filter((c): c is FinancialCompanyData => !isError(c));
  const fail = companies.filter(isError);

  if (ok.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Financials Comparison</p>
        {fail.map((f) => <p key={f.name} className="text-xs text-destructive">{f.name}: {f.error}</p>)}
      </div>
    );
  }

  const isVal = activeTab === "val";

  // For valuation tab: one value per company
  const val1 = (fn: (c: FinancialCompanyData) => string) => ok.map(fn);

  return (
    <div className="flex flex-col gap-3">
      {fail.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          {fail.map((f) => <p key={f.name} className="text-xs text-destructive">{f.name}: {f.error}</p>)}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
        <table className="w-full text-left">
          <thead>
            {/* Company headers — dark professional */}
            <tr>
              <th className="w-48 bg-slate-800 px-4 py-3 text-xs font-medium text-slate-400">Metric</th>
              {ok.map((c, idx) => {
                const p = PALETTE[idx % PALETTE.length];
                const span = isVal ? 1 : Math.min(c.years.length, 3);
                return (
                  <th key={c.name} colSpan={span}
                    className={`bg-slate-800 px-4 py-3 text-center ${p.topBorder} ${p.divider}`}
                  >
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                      {c.ticker} · {c.currency === "INR_CR" ? "₹ Crores" : "$ Millions"}
                    </p>
                    {c.dataNote ? <p className="text-[10px] font-normal text-slate-500">{c.dataNote}</p> : null}
                  </th>
                );
              })}
            </tr>

            {/* Year sub-headers */}
            <tr className="border-b-2 border-border">
              <th className="bg-muted/70 px-4 py-2" />
              {ok.map((c, idx) => {
                const p = PALETTE[idx % PALETTE.length];
                if (isVal) {
                  return (
                    <th key={c.name}
                      className={`bg-muted/70 px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground ${idx > 0 ? p.divider : ""}`}
                    >
                      Current
                    </th>
                  );
                }
                return c.years.slice(0, 3).map((yr, yi) => (
                  <th key={`${c.name}-${yr.year}`}
                    className={`bg-muted/70 px-3 py-2 text-right text-[11px] font-semibold tracking-wide text-muted-foreground ${idx > 0 && yi === 0 ? p.divider : ""}`}
                  >
                    {yr.year}
                  </th>
                ));
              })}
            </tr>
          </thead>

          <tbody>
            {/* P&L */}
            {activeTab === "pl" && (<>
              <Row bold label="Revenue"           values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbs(y.revenue, c.currency)))} />
              <Row indent growth label="YoY Growth" values={ok.flatMap((c) => c.years.slice(0, 3).map((y, i) => yoy(y.revenue, c.years[i + 1]?.revenue)))} />
              <Row bold label="Gross Profit"      values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbs(y.grossProfit, c.currency)))} />
              <Row indent label="Gross Margin"    values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => margin(y.grossProfit, y.revenue)))} />
              <Row bold label="EBITDA"            values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbs(y.ebitda, c.currency)))} />
              <Row indent label="EBITDA Margin"   values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => margin(y.ebitda, y.revenue)))} />
              <Row bold label="Operating Income"  values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbs(y.operatingIncome, c.currency)))} />
              <Row indent label="Operating Margin" values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => margin(y.operatingIncome, y.revenue)))} />
              <Row bold label="Net Income (PAT)"  values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbs(y.netIncome, c.currency)))} />
              <Row indent label="Net Margin"      values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => margin(y.netIncome, y.revenue)))} />
              <Row label="EPS (Diluted)"          values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => fmtEPS(y.eps, c.currency)))} />
            </>)}

            {/* Balance Sheet */}
            {activeTab === "bs" && (<>
              <Row bold label="Total Assets"           values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbs(y.totalAssets, c.currency)))} />
              <Row bold label="Total Debt"             values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbs(y.totalDebt, c.currency)))} />
              <Row bold label="Shareholders' Equity"   values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbs(y.totalEquity, c.currency)))} />
              <Row indent label="Debt / Equity"        values={ok.flatMap((c) =>
                c.years.slice(0, 3).map((y) =>
                  y.totalDebt == null || y.totalEquity == null || y.totalEquity === 0 ? "—"
                  : `${(y.totalDebt / y.totalEquity).toFixed(2)}x`
                )
              )} />
            </>)}

            {/* Cash Flow */}
            {activeTab === "cf" && (<>
              <Row bold label="Operating Cash Flow"  values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbs(y.operatingCashFlow, c.currency)))} />
              <Row bold label="Capital Expenditure"  values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbs(y.capex, c.currency)))} />
              <Row bold label="Free Cash Flow" hint="(OCF − Capex)" values={ok.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbs(fcf(y.operatingCashFlow, y.capex), c.currency)))} />
            </>)}

            {/* Valuation — single column per company */}
            {activeTab === "val" && (<>
              <Row bold   label="Market Cap"      values={val1((c) => fmtAbs(c.ratios.marketCap, c.currency))} />
              <Row bold   label="P/E (TTM)"       values={val1((c) => fmtMult(c.ratios.pe))} />
              <Row indent label="Forward P/E"     values={val1((c) => fmtMult(c.ratios.forwardPE))} />
              <Row indent label="P/B"             values={val1((c) => fmtMult(c.ratios.pb))} />
              <Row bold   label="EV / EBITDA"     values={val1((c) => fmtMult(c.ratios.evEbitda))} />
              <Row bold   label="ROE"             values={val1((c) => fmtPct(c.ratios.roe))} />
              <Row indent label="ROA"             values={val1((c) => fmtPct(c.ratios.roa))} />
              <Row indent label="Debt / Equity"   values={val1((c) => fmtMult(c.ratios.debtToEquity))} />
              <Row indent label="Current Ratio"   values={val1((c) => fmtMult(c.ratios.currentRatio))} />
              <Row indent label="Dividend Yield"  values={val1((c) => fmtPct(c.ratios.dividendYield))} />
              <Row indent label="Beta"            values={val1((c) => fmtMult(c.ratios.beta, ""))} />
            </>)}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] italic text-muted-foreground">
        AI-generated from publicly available annual reports · Verify before use in presentations.
        "—" = data not reliably available · Growth highlighted green / red.
      </p>
    </div>
  );
}
