import type { ImpactLevel, Maturity } from "@/lib/types";
import { SourceLink } from "./source-link";

export type TagVariant = "positive" | "warning" | "neutral" | "info";

export interface TaggedCardItem {
  title: string;
  description: string;
  tag?: string;
  tagVariant?: TagVariant;
}

export const TAG_STYLES: Record<TagVariant, string> = {
  positive: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export function TaggedCardGrid({ items, searchContext }: { items: TaggedCardItem[]; searchContext?: string }) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.title} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            {searchContext ? (
              <SourceLink query={`${item.title} ${searchContext}`}>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
              </SourceLink>
            ) : (
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
            )}
            {item.tag ? (
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${TAG_STYLES[item.tagVariant ?? "neutral"]}`}
              >
                {item.tag}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

export function maturityVariant(maturity: Maturity): TagVariant {
  switch (maturity) {
    case "emerging":
      return "info";
    case "scaling":
      return "warning";
    case "mainstream":
      return "positive";
  }
}

export function impactVariant(impact: ImpactLevel): TagVariant {
  switch (impact) {
    case "high":
      return "positive";
    case "medium":
      return "warning";
    case "low":
      return "neutral";
  }
}

export function originVariant(origin: "Indian" | "Global"): TagVariant {
  return origin === "Indian" ? "info" : "neutral";
}
