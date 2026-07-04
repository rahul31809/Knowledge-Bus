import type { PrimerGlossaryTerm } from "@/lib/types";

export function GlossaryGrid({ terms }: { terms: PrimerGlossaryTerm[] }) {
  if (terms.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {terms.map((t) => (
        <div key={t.term} className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-bold text-foreground">{t.term}</p>
          {t.formula && (
            <p className="mt-1 rounded bg-muted px-2 py-0.5 font-mono text-xs text-primary">
              {t.formula}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">{t.definition}</p>
        </div>
      ))}
    </div>
  );
}
