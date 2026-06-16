import type { PrimerStat } from "@/lib/types";

// sm:grid-cols-N must be a literal class for Tailwind's compiler to pick up —
// pick the column count from the actual stat count (max 4) so 2-stat rows
// (Market Size & Growth / Future Outlook headers) don't get squeezed into
// quarter-width tiles and wrap into oversized boxes.
const SM_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

export function StatRow({ stats }: { stats: PrimerStat[] }) {
  if (stats.length === 0) return null;
  const smCols = SM_COLS[Math.min(stats.length, 4)] ?? "sm:grid-cols-4";

  return (
    <div className={`grid grid-cols-2 gap-3 ${smCols}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-border bg-muted p-3">
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className="mt-1 text-base font-semibold text-foreground sm:text-lg">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
