import type { PorterDegree, PrimerPorterForce } from "@/lib/types";

function degreeBadge(degree: PorterDegree) {
  if (degree === "High")
    return "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400";
  if (degree === "Low")
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
}

export function PorterFiveForces({ forces }: { forces: PrimerPorterForce[] }) {
  if (forces.length === 0) return null;
  return (
    <div className="flex flex-col divide-y divide-border">
      {forces.map((f) => (
        <div key={f.force} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <span
            className={`mt-0.5 shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${degreeBadge(f.degree)}`}
          >
            {f.degree}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">{f.force}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{f.reason}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
