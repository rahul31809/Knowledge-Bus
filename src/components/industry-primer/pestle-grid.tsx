import type { PestleFactor, PrimerPestleItem } from "@/lib/types";

const FACTOR_META: Record<PestleFactor, { icon: string; color: string }> = {
  Political:     { icon: "🏛️", color: "border-blue-500/30 bg-blue-500/5" },
  Economic:      { icon: "📈", color: "border-emerald-500/30 bg-emerald-500/5" },
  Social:        { icon: "👥", color: "border-violet-500/30 bg-violet-500/5" },
  Technological: { icon: "⚡", color: "border-amber-500/30 bg-amber-500/5" },
  Environmental: { icon: "🌱", color: "border-green-500/30 bg-green-500/5" },
  Legal:         { icon: "⚖️", color: "border-rose-500/30 bg-rose-500/5" },
};

export function PestleGrid({ items }: { items: PrimerPestleItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const meta = FACTOR_META[item.factor];
        return (
          <div key={item.factor} className={`rounded-lg border p-3 ${meta.color}`}>
            <p className="text-xs font-bold text-foreground">
              {meta.icon} {item.factor}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{item.description}</p>
          </div>
        );
      })}
    </div>
  );
}
