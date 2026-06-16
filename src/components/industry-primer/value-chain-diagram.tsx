import { ArrowRightIcon } from "lucide-react";
import type { PrimerValueChainStage, ValueCapture } from "@/lib/types";
import { SourceLink } from "./source-link";

const CAPTURE_STYLES: Record<ValueCapture, string> = {
  high: "border-emerald-500/30 bg-emerald-500/10",
  medium: "border-amber-500/30 bg-amber-500/10",
  low: "border-border bg-muted",
};

const CAPTURE_LEGEND: { capture: ValueCapture; label: string; dot: string }[] = [
  { capture: "high", label: "High value capture", dot: "bg-emerald-500" },
  { capture: "medium", label: "Medium value capture", dot: "bg-amber-500" },
  { capture: "low", label: "Low value capture", dot: "bg-muted-foreground/40" },
];

export function ValueChainDiagram({
  stages,
  searchContext,
}: {
  stages: PrimerValueChainStage[];
  searchContext?: string;
}) {
  if (stages.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-2">
        {stages.map((stage, index) => (
          <div key={stage.name} className="flex flex-1 items-center gap-2">
            <div className={`flex-1 rounded-lg border p-3 ${CAPTURE_STYLES[stage.value_capture]}`}>
              {searchContext ? (
                <SourceLink query={`${stage.name} ${searchContext}`}>
                  <p className="text-sm font-semibold text-foreground">{stage.name}</p>
                </SourceLink>
              ) : (
                <p className="text-sm font-semibold text-foreground">{stage.name}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{stage.description}</p>
            </div>
            {index < stages.length - 1 ? (
              <ArrowRightIcon className="hidden size-4 shrink-0 text-muted-foreground/40 sm:block" />
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {CAPTURE_LEGEND.map((item) => (
          <span key={item.capture} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${item.dot}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
