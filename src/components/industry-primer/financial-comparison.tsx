"use client";

import { useState } from "react";
import type { FinancialCompanyData, FinancialCompanyError, FinancialCompanyResult } from "@/app/api/industries/financials/route";

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = "pl" | "bs" | "cf" | "val";

const TABS: { id: Tab; label: string }[] = [
  { id: "pl", label: "P&L" },
  { id: "bs", label: "Balance Sheet" },
  { id: "cf", label: "Cash Flow" },
  { id: "val", label: "Valuation" },
];

// ─── Formatters ─────────────────────────────────────────────────────────────

function fmtAbsolute(val: number | null | undefined, currency: string): string {
  if (val == null) return "—";
  if (currency === "INR_CR") {
    if (Math.abs(val) >= 100_000) return `₹${(val / 100_000).toFixed(2)}L Cr`;
    if (Math.abs(val) >= 1_000) return `₹${(val / 1_000).toFixed(1)}K Cr`;
    return `₹${val.toFixed(0)} Cr`;
  }
  if (currency === "USD_M") {
    if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(2)}B`;
    return `$${val.toFixed(0)}M`;
  }
  return val.toFixed(0);
}

function fmtPct(val: number | null | undefined): string {
  if (val == null) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

function fmtMultiple(val: number | null | undefined, suffix = "x"): string {
  if (val == null) return "—";
  return `${val.toFixed(1)}${suffix}`;
}

function fmtEPS(val: number | null | undefined, currency: string): string {
  if (val == null) return "—";
  const symbol = currency === "INR_CR" ? "₹" : "$";
  return `${symbol}${val.toFixed(2)}`;
}

function margin(num: number | null | undefined, denom: number | null | undefined): string {
  if (num == null || denom == null || denom === 0) return "—";
  return `${((num / denom) * 100).toFixed(1)}%`;
}

function fcf(ocf: number | null | undefined, capex: number | null | undefined): number | undefined {
  if (ocf == null) return undefined;
  return ocf - Math.abs(capex ?? 0);
}

function yoyGrowth(curr: number | null | undefined, prev: number | null | undefined): string {
  if (curr == null || prev == null || prev === 0) return "—";
  return `${(((curr - prev) / Math.abs(prev)) * 100).toFixed(1)}%`;
}

// ─── Company accent palette ───────────────────────────────────────────────────
// Dark professional headers; per-company coloured top border only

const PALETTE = [
  { topBorder: "border-t-[4px] border-indigo-400", divider: "" },
  { topBorder: "border-t-[4px] border-violet-400", divider: "border-l border-slate-600" },
  { topBorder: "border-t-[4px] border-sky-400",    divider: "border-l border-slate-600" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricRow({
  label,
  hint,
  values,
  growth,
  key_metric,
  indent,
}: {
  label: string;
  hint?: string;
  values: (string | undefined)[];
  growth?: boolean;
  key_metric?: boolean;
  indent?: boolean;
}) {
  return (
    <tr
      className={`border-t transition-colors hover:bg-muted/20 ${
        key_metric ? "border-border bg-muted/10" : "border-border/30"
      }`}
    >
      <td
        className={`w-48 py-2.5 pr-3 text-xs ${indent ? "pl-7" : "pl-4"} ${
          key_metric ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
        }`}
      >
        {label}
        {hint ? <span className="ml-1 text-[10px] font-normal opacity-50">{hint}</span> : null}
      </td>
      {values.map((v, i) => {
        let cls = key_metric ? "font-semibold text-foreground" : "text-foreground";
        if (growth && v && v !== "—") {
          const num = parseFloat(v);
          if (!isNaN(num)) {
            cls = num > 0
              ? "font-semibold text-emerald-600 dark:text-emerald-400"
              : "font-semibold text-rose-500 dark:text-rose-400";
          }
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

// ─── Type guard ───────────────────────────────────────────────────────────────

function isError(c: FinancialCompanyResult): c is FinancialCompanyError {
  return "error" in c && typeof (c as FinancialCompanyError).error === "string";
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function FinancialComparison({ companies }: { companies: FinancialCompanyResult[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("pl");

  const successful = companies.filter((c): c is FinancialCompanyData => !isError(c));
  const failed = companies.filter(isError);

  if (successful.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Financials Comparison</p>
        {failed.map((f) => (
          <p key={f.name} className="text-xs text-destructive">{f.name}: {f.error}</p>
        ))}
      </div>
    );
  }

  const latestOnly = (fn: (c: FinancialCompanyData) => string) =>
    successful.flatMap((c) =>
      Array(Math.min(c.years.length, 3)).fill(0).map((_, i) => (i === 0 ? fn(c) : ""))
    );

  return (
    <div className="flex flex-col gap-3">
      {failed.length > 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          {failed.map((f) => (
            <p key={f.name} className="text-xs text-destructive">{f.name}: {f.error}</p>
          ))}
        </div>
      ) : null}

      {/* ── Tab bar ── */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
        <table className="w-full text-left">
          <thead>
            {/* Company name headers — dark professional */}
            <tr>
              <th className="w-48 bg-slate-800 px-4 py-3 text-xs font-medium text-slate-400">
                Metric
              </th>
              {successful.map((company, idx) => {
                const palette = PALETTE[idx % PALETTE.length];
                const yearCount = Math.min(company.years.length, 3);
                return (
                  <th
                    key={company.name}
                    colSpan={yearCount}
                    className={`bg-slate-800 px-4 py-3 text-center ${palette.topBorder} ${palette.divider}`}
                  >
                    <p className="text-sm font-bold text-white">{company.name}</p>
                    <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                      {company.ticker} · {company.currency === "INR_CR" ? "₹ Crores" : "$ Millions"}
                    </p>
                    {company.dataNote ? (
                      <p className="text-[10px] font-normal text-slate-500">{company.dataNote}</p>
                    ) : null}
                  </th>
                );
              })}
            </tr>

            {/* Year sub-headers */}
            <tr className="border-b-2 border-border">
              <th className="bg-muted/70 px-4 py-2" />
              {successful.map((company, idx) => {
                const palette = PALETTE[idx % PALETTE.length];
                return company.years.slice(0, 3).map((yr, yIdx) => (
                  <th
                    key={`${company.name}-${yr.year}`}
                    className={`bg-muted/70 px-3 py-2 text-right text-[11px] font-semibold tracking-wide text-muted-foreground ${
                      idx > 0 && yIdx === 0 ? palette.divider : ""
                    }`}
                  >
                    {yr.year}
                  </th>
                ));
              })}
            </tr>
          </thead>

          <tbody>
            {/* ── P&L ── */}
            {activeTab === "pl" && (
              <>
                <MetricRow
                  label="Revenue"
                  key_metric
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbsolute(y.revenue, c.currency)))}
                />
                <MetricRow
                  label="YoY Growth"
                  indent
                  growth
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y, i) => yoyGrowth(y.revenue, c.years[i + 1]?.revenue)))}
                />
                <MetricRow
                  label="Gross Profit"
                  key_metric
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbsolute(y.grossProfit, c.currency)))}
                />
                <MetricRow
                  label="Gross Margin"
                  indent
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => margin(y.grossProfit, y.revenue)))}
                />
                <MetricRow
                  label="EBITDA"
                  key_metric
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbsolute(y.ebitda, c.currency)))}
                />
                <MetricRow
                  label="EBITDA Margin"
                  indent
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => margin(y.ebitda, y.revenue)))}
                />
                <MetricRow
                  label="Operating Income"
                  key_metric
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbsolute(y.operatingIncome, c.currency)))}
                />
                <MetricRow
                  label="Operating Margin"
                  indent
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => margin(y.operatingIncome, y.revenue)))}
                />
                <MetricRow
                  label="Net Income (PAT)"
                  key_metric
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbsolute(y.netIncome, c.currency)))}
                />
                <MetricRow
                  label="Net Margin"
                  indent
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => margin(y.netIncome, y.revenue)))}
                />
                <MetricRow
                  label="EPS (Diluted)"
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => fmtEPS(y.eps, c.currency)))}
                />
              </>
            )}

            {/* ── Balance Sheet ── */}
            {activeTab === "bs" && (
              <>
                <MetricRow
                  label="Total Assets"
                  key_metric
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbsolute(y.totalAssets, c.currency)))}
                />
                <MetricRow
                  label="Total Debt"
                  key_metric
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbsolute(y.totalDebt, c.currency)))}
                />
                <MetricRow
                  label="Shareholders' Equity"
                  key_metric
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbsolute(y.totalEquity, c.currency)))}
                />
                <MetricRow
                  label="Debt / Equity"
                  indent
                  values={successful.flatMap((c) =>
                    c.years.slice(0, 3).map((y) => {
                      if (y.totalDebt == null || y.totalEquity == null || y.totalEquity === 0) return "—";
                      return `${(y.totalDebt / y.totalEquity).toFixed(2)}x`;
                    })
                  )}
                />
              </>
            )}

            {/* ── Cash Flow ── */}
            {activeTab === "cf" && (
              <>
                <MetricRow
                  label="Operating Cash Flow"
                  key_metric
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbsolute(y.operatingCashFlow, c.currency)))}
                />
                <MetricRow
                  label="Capital Expenditure"
                  key_metric
                  values={successful.flatMap((c) => c.years.slice(0, 3).map((y) => fmtAbsolute(y.capex, c.currency)))}
                />
                <MetricRow
                  label="Free Cash Flow"
                  key_metric
                  hint="(OCF − Capex)"
                  values={successful.flatMap((c) =>
                    c.years.slice(0, 3).map((y) => fmtAbsolute(fcf(y.operatingCashFlow, y.capex), c.currency))
                  )}
                />
              </>
            )}

            {/* ── Valuation & Returns ── */}
            {activeTab === "val" && (
              <>
                <MetricRow label="Market Cap"       key_metric values={latestOnly((c) => fmtAbsolute(c.ratios.marketCap, c.currency))} />
                <MetricRow label="P/E (TTM)"        key_metric values={latestOnly((c) => fmtMultiple(c.ratios.pe))} />
                <MetricRow label="Forward P/E"      indent     values={latestOnly((c) => fmtMultiple(c.ratios.forwardPE))} />
                <MetricRow label="P/B"              indent     values={latestOnly((c) => fmtMultiple(c.ratios.pb))} />
                <MetricRow label="EV / EBITDA"      key_metric values={latestOnly((c) => fmtMultiple(c.ratios.evEbitda))} />
                <MetricRow label="ROE"              key_metric values={latestOnly((c) => fmtPct(c.ratios.roe))} />
                <MetricRow label="ROA"              indent     values={latestOnly((c) => fmtPct(c.ratios.roa))} />
                <MetricRow label="Debt / Equity"    indent     values={latestOnly((c) => fmtMultiple(c.ratios.debtToEquity))} />
                <MetricRow label="Current Ratio"    indent     values={latestOnly((c) => fmtMultiple(c.ratios.currentRatio))} />
                <MetricRow label="Dividend Yield"   indent     values={latestOnly((c) => fmtPct(c.ratios.dividendYield))} />
                <MetricRow label="Beta"             indent     values={latestOnly((c) => fmtMultiple(c.ratios.beta, ""))} />
              </>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] italic text-muted-foreground">
        AI-generated from publicly available annual reports and filings · Verify key figures before use in presentations.
        "—" indicates data not reliably available · Revenue growth highlighted green / red.
      </p>
    </div>
  );
}
