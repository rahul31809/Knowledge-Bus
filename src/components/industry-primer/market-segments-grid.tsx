import type { PrimerMarketSegment } from "@/lib/types";

export function MarketSegmentsGrid({ segments }: { segments: PrimerMarketSegment[] }) {
  if (segments.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {segments.map((seg) => (
        <div key={seg.name} className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-bold text-foreground">{seg.name}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{seg.description}</p>
          {seg.examples && (
            <p className="mt-2 text-[10px] font-medium text-muted-foreground/70">
              e.g. {seg.examples}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
