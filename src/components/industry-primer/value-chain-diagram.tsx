import { ArrowRightIcon } from "lucide-react";
import type { PrimerValueChainStage, ValueCapture } from "@/lib/types";
import { SourceLink } from "./source-link";

// All boxes share the same neutral base; value capture shown via coloured top border only
const CAPTURE_STYLES: Record<ValueCapture, string> = {
  high:   "border-t-[3px] border-t-emerald-500 border-x border-b border-border bg-card",
  medium: "border-t-[3px] border-t-amber-400   border-x border-b border-border bg-card",
  low:    "border-t-[3px] border-t-slate-400    border-x border-b border-border bg-card",
};

const CAPTURE_LEGEND: { capture: ValueCapture; label: string; dot: string }[] = [
  { capture: "high",   label: "High value capture",   dot: "bg-emerald-500" },
  { capture: "medium", label: "Medium value capture", dot: "bg-amber-400" },
  { capture: "low",    label: "Low value capture",    dot: "bg-slate-400" },
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        {stages.map((stage, index) => (
          <div key={stage.name} className="flex flex-1 items-stretch gap-2">
            <div className={`flex flex-1 flex-col rounded-xl p-4 ${CAPTURE_STYLES[stage.value_capture]}`}>
              {searchContext ? (
                <SourceLink query={`${stage.name} ${searchContext}`}>
                  <p className="text-sm font-semibold text-foreground">{stage.name}</p>
                </SourceLink>
              ) : (
                <p className="text-sm font-semibold text-foreground">{stage.name}</p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {stage.description}
              </p>
            </div>
            {index < stages.length - 1 ? (
              <div className="hidden shrink-0 items-center sm:flex">
                <ArrowRightIcon className="size-4 text-muted-foreground/40" />
              </div>
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
