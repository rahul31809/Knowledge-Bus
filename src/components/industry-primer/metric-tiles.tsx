import type { PrimerMetric } from "@/lib/types";
import { SourceLink } from "./source-link";

export function MetricTiles({ metrics, searchContext }: { metrics: PrimerMetric[]; searchContext?: string }) {
  if (metrics.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.name} className="rounded-lg border border-border bg-card p-3">
          {searchContext ? (
            <SourceLink query={`${metric.name} ${searchContext}`}>
              <p className="text-xs font-medium text-muted-foreground">{metric.name}</p>
            </SourceLink>
          ) : (
            <p className="text-xs font-medium text-muted-foreground">{metric.name}</p>
          )}
          <p className="mt-1 text-base font-semibold text-foreground">{metric.benchmark}</p>
          <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
        </div>
      ))}
    </div>
  );
}
