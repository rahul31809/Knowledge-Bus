"use client";

import type { FinancialCompanyData, FinancialCompanyError, FinancialCompanyResult } from "@/app/api/industries/financials/route";

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-muted/60">
      <td colSpan={999} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </td>
    </tr>
  );
}

function MetricRow({
  label,
  hint,
  values,
}: {
  label: string;
  hint?: string;
  values: (string | undefined)[];
}) {
  return (
    <tr className="border-t border-border hover:bg-muted/20">
      <td className="py-2 pl-3 pr-4 text-xs text-muted-foreground">
        {label}
        {hint ? <span className="ml-1 text-[10px] opacity-60">{hint}</span> : null}
      </td>
      {values.map((v, i) => (
        <td key={i} className="px-2 py-2 text-center text-xs font-medium text-foreground">
          {v ?? "—"}
        </td>
      ))}
    </tr>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

function isError(c: FinancialCompanyResult): c is FinancialCompanyError {
  return "error" in c && typeof (c as FinancialCompanyError).error === "string";
}

export function FinancialComparison({ companies }: { companies: FinancialCompanyResult[] }) {
  const successful = companies.filter((c): c is FinancialCompanyData => !isError(c));
  const failed = companies.filter(isError);

  // Build ordered year labels across all companies (most-recent first, deduplicated)
  const allYears = Array.from(
    new Set(successful.flatMap((c) => c.years.map((y) => y.year)))
  ).sort((a, b) => b.localeCompare(a)).slice(0, 3);

  // For each company, map year label → FinancialYear
  const byYear = (company: FinancialCompanyData, year: string) =>
    company.years.find((y) => y.year === year);

  // Column header: each company spans its available years
  const colCount = successful.reduce((n, c) => n + Math.min(c.years.length, 3), 0);

  if (successful.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground mb-2">Financial Comparison</p>
        {failed.map((f) => (
          <p key={f.name} className="text-xs text-destructive">
            {f.name}: {f.error}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {failed.length > 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          {failed.map((f) => (
            <p key={f.name} className="text-xs text-destructive">
              {f.name}: {f.error}
            </p>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border text-sm">
        <table className="w-full text-left">
          <thead>
            {/* Company name headers */}
            <tr className="bg-muted border-b border-border">
              <th className="w-44 px-3 py-2 text-xs font-medium text-muted-foreground">Metric</th>
              {successful.map((company) => {
                const yearCount = Math.min(company.years.length, 3);
                return (
                  <th
                    key={company.name}
                    colSpan={yearCount}
                    className="px-2 py-2 text-center text-xs font-semibold text-foreground border-l border-border"
                  >
                    {company.name}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      ({company.ticker} · {company.currency === "INR_CR" ? "₹ Cr" : "$ M"})
                    </span>
                    {company.dataNote ? (
                      <span className="block text-[10px] font-normal text-muted-foreground/70">{company.dataNote}</span>
                    ) : null}
                  </th>
                );
              })}
            </tr>
            {/* Year sub-headers */}
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-1.5" />
              {successful.map((company) =>
                company.years.slice(0, 3).map((yr) => (
                  <th
                    key={`${company.name}-${yr.year}`}
                    className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground"
                  >
                    {yr.year}
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {/* ── P&L ── */}
            <SectionHeader label="Income Statement" />

            <MetricRow
              label="Revenue"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => fmtAbsolute(y.revenue, c.currency))
              )}
            />
            <MetricRow
              label="Rev Growth YoY"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y, i) =>
                  yoyGrowth(y.revenue, c.years[i + 1]?.revenue)
                )
              )}
            />
            <MetricRow
              label="Gross Profit"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => fmtAbsolute(y.grossProfit, c.currency))
              )}
            />
            <MetricRow
              label="Gross Margin"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => margin(y.grossProfit, y.revenue))
              )}
            />
            <MetricRow
              label="EBITDA"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => fmtAbsolute(y.ebitda, c.currency))
              )}
            />
            <MetricRow
              label="EBITDA Margin"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => margin(y.ebitda, y.revenue))
              )}
            />
            <MetricRow
              label="Operating Income"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => fmtAbsolute(y.operatingIncome, c.currency))
              )}
            />
            <MetricRow
              label="Operating Margin"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => margin(y.operatingIncome, y.revenue))
              )}
            />
            <MetricRow
              label="Net Income"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => fmtAbsolute(y.netIncome, c.currency))
              )}
            />
            <MetricRow
              label="Net Margin"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => margin(y.netIncome, y.revenue))
              )}
            />
            <MetricRow
              label="EPS (Diluted)"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => fmtEPS(y.eps, c.currency))
              )}
            />

            {/* ── Balance Sheet ── */}
            <SectionHeader label="Balance Sheet" />

            <MetricRow
              label="Total Assets"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => fmtAbsolute(y.totalAssets, c.currency))
              )}
            />
            <MetricRow
              label="Total Debt"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => fmtAbsolute(y.totalDebt, c.currency))
              )}
            />
            <MetricRow
              label="Shareholders' Equity"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => fmtAbsolute(y.totalEquity, c.currency))
              )}
            />
            <MetricRow
              label="Debt / Equity"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => {
                  if (y.totalDebt == null || y.totalEquity == null || y.totalEquity === 0) return "—";
                  return `${(y.totalDebt / y.totalEquity).toFixed(2)}x`;
                })
              )}
            />

            {/* ── Cash Flow ── */}
            <SectionHeader label="Cash Flow" />

            <MetricRow
              label="Operating Cash Flow"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => fmtAbsolute(y.operatingCashFlow, c.currency))
              )}
            />
            <MetricRow
              label="Capex"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => fmtAbsolute(y.capex, c.currency))
              )}
            />
            <MetricRow
              label="Free Cash Flow"
              hint="(OCF − Capex)"
              values={successful.flatMap((c) =>
                c.years.slice(0, 3).map((y) => fmtAbsolute(fcf(y.operatingCashFlow, y.capex), c.currency))
              )}
            />

            {/* ── Valuation & Returns (current) ── */}
            <SectionHeader label="Valuation & Returns (Latest)" />

            <MetricRow
              label="Market Cap"
              values={successful.flatMap((c) => Array(Math.min(c.years.length, 3)).fill(0).map((_, i) => i === 0 ? fmtAbsolute(c.ratios.marketCap, c.currency) : ""))}
            />
            <MetricRow
              label="P/E (TTM)"
              values={successful.flatMap((c) => Array(Math.min(c.years.length, 3)).fill(0).map((_, i) => i === 0 ? fmtMultiple(c.ratios.pe) : ""))}
            />
            <MetricRow
              label="Forward P/E"
              values={successful.flatMap((c) => Array(Math.min(c.years.length, 3)).fill(0).map((_, i) => i === 0 ? fmtMultiple(c.ratios.forwardPE) : ""))}
            />
            <MetricRow
              label="P/B"
              values={successful.flatMap((c) => Array(Math.min(c.years.length, 3)).fill(0).map((_, i) => i === 0 ? fmtMultiple(c.ratios.pb) : ""))}
            />
            <MetricRow
              label="EV / EBITDA"
              values={successful.flatMap((c) => Array(Math.min(c.years.length, 3)).fill(0).map((_, i) => i === 0 ? fmtMultiple(c.ratios.evEbitda) : ""))}
            />
            <MetricRow
              label="ROE"
              values={successful.flatMap((c) => Array(Math.min(c.years.length, 3)).fill(0).map((_, i) => i === 0 ? fmtPct(c.ratios.roe) : ""))}
            />
            <MetricRow
              label="ROA"
              values={successful.flatMap((c) => Array(Math.min(c.years.length, 3)).fill(0).map((_, i) => i === 0 ? fmtPct(c.ratios.roa) : ""))}
            />
            <MetricRow
              label="D/E Ratio"
              values={successful.flatMap((c) => Array(Math.min(c.years.length, 3)).fill(0).map((_, i) => i === 0 ? fmtMultiple(c.ratios.debtToEquity) : ""))}
            />
            <MetricRow
              label="Current Ratio"
              values={successful.flatMap((c) => Array(Math.min(c.years.length, 3)).fill(0).map((_, i) => i === 0 ? fmtMultiple(c.ratios.currentRatio) : ""))}
            />
            <MetricRow
              label="Dividend Yield"
              values={successful.flatMap((c) => Array(Math.min(c.years.length, 3)).fill(0).map((_, i) => i === 0 ? fmtPct(c.ratios.dividendYield) : ""))}
            />
            <MetricRow
              label="Beta"
              values={successful.flatMap((c) => Array(Math.min(c.years.length, 3)).fill(0).map((_, i) => i === 0 ? fmtMultiple(c.ratios.beta, "") : ""))}
            />
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        AI-generated from publicly available annual reports and filings (Gemini) · Verify key figures against source documents before use in presentations.
        "—" indicates data not reliably available · INR values in ₹ Crores · USD values in $ Millions.
      </p>
    </div>
  );
}
