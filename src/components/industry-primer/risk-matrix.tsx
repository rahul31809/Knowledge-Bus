import type { PrimerRiskItem, PrimerRiskMatrix } from "@/lib/types";

const QUADRANTS: {
  key: keyof PrimerRiskMatrix;
  label: string;
  icon: string;
  color: string;
}[] = [
  { key: "financial",   label: "Financial",   icon: "💰", color: "border-rose-500/30 bg-rose-500/5" },
  { key: "operational", label: "Operational", icon: "⚙️", color: "border-amber-500/30 bg-amber-500/5" },
  { key: "regulatory",  label: "Regulatory",  icon: "⚖️", color: "border-blue-500/30 bg-blue-500/5" },
  { key: "technology",  label: "Technology",  icon: "💻", color: "border-violet-500/30 bg-violet-500/5" },
];

function RiskList({ items }: { items: PrimerRiskItem[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {items.map((r) => (
        <li key={r.title}>
          <p className="text-xs font-medium text-foreground">{r.title}</p>
          <p className="text-[10px] text-muted-foreground">{r.description}</p>
        </li>
      ))}
    </ul>
  );
}

export function RiskMatrixGrid({ matrix }: { matrix: PrimerRiskMatrix }) {
  const hasContent = QUADRANTS.some((q) => matrix[q.key].length > 0);
  if (!hasContent) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {QUADRANTS.map((q) => (
        <div key={q.key} className={`rounded-lg border p-3 ${q.color}`}>
          <p className="text-xs font-bold text-foreground">
            {q.icon} {q.label} Risk
          </p>
          <RiskList items={matrix[q.key]} />
        </div>
      ))}
    </div>
  );
}
