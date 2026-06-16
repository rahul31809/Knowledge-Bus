import type { PrimerStat } from "@/lib/types";

// sm:grid-cols-N must be a literal class for Tailwind's compiler to pick up
const SM_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

// Handles AI occasionally returning raw numbers without units/symbols
function fmtStatValue(label: string, raw: string): string {
  if (/[₹%]|Cr\b|Bn\b|Mn\b|lakh|crore/i.test(raw)) return raw;

  const cleaned = raw.replace(/,/g, "").trim();
  const num = Number(cleaned);
  if (isNaN(num) || cleaned === "") return raw;

  const l = label.toLowerCase();

  if (/cagr|growth|rate|yield|return|margin|roe|roa/i.test(l)) {
    return `${Number.isInteger(num) ? num : num.toFixed(1)}%`;
  }
  if (/market|size|revenue|profit|gdp|value|spend|invest|sales|cap|fund/i.test(l)) {
    if (Math.abs(num) >= 100_000) return `₹${(num / 100_000).toFixed(1)}L Cr`;
    if (Math.abs(num) >= 1_000) return `₹${(num / 1_000).toFixed(0)}K Cr`;
    return `₹${num.toLocaleString("en-IN")} Cr`;
  }
  if (/p\/e|ev\/|ratio|multiple|times/i.test(l)) return `${num.toFixed(1)}x`;
  if (Math.abs(num) >= 1_000) return num.toLocaleString("en-IN");
  return raw;
}

export function StatRow({ stats }: { stats: PrimerStat[] }) {
  if (stats.length === 0) return null;
  const smCols = SM_COLS[Math.min(stats.length, 4)] ?? "sm:grid-cols-4";

  return (
    <div className={`grid grid-cols-2 gap-3 ${smCols}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {stat.label}
          </p>
          <p className="mt-2 text-xl font-bold tabular-nums text-foreground sm:text-2xl">
            {fmtStatValue(stat.label, stat.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
