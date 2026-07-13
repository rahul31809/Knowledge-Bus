import type { PrimerTrendPoint } from "@/lib/types";

export function BarChart({ data, unit, label }: { data: PrimerTrendPoint[]; unit?: string; label?: string }) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((point) => point.value), 1);
  const ariaLabel = label
    ? label
    : `Bar chart${unit ? ` (${unit})` : ""}: ${data.map((p) => `${p.label}: ${p.value.toLocaleString()}`).join(", ")}`;

  return (
    <div role="img" aria-label={ariaLabel}>
      {unit ? <p className="mb-2 text-xs text-muted-foreground">Values in {unit}</p> : null}
      <div className="flex items-end gap-3 sm:gap-4" style={{ height: "140px" }}>
        {data.map((point) => (
          <div key={point.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="tabular-nums text-xs font-medium text-foreground">{point.value.toLocaleString()}</span>
            <div
              role="presentation"
              className="w-full rounded-t-md bg-primary"
              style={{ height: `${Math.max((point.value / max) * 100, 4)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-3 sm:gap-4">
        {data.map((point) => (
          <span key={point.label} className="flex-1 text-center text-xs text-muted-foreground">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}
