import type { PrimerBusinessModel } from "@/lib/types";

export function BusinessModelsGrid({ models }: { models: PrimerBusinessModel[] }) {
  if (models.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {models.map((m) => (
        <div key={m.name} className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-bold text-foreground">{m.name}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{m.description}</p>
        </div>
      ))}
    </div>
  );
}
