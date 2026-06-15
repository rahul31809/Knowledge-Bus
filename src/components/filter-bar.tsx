import Link from "next/link";
import { ENTRY_TYPES, type EntryType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  activeType?: string;
  activeTag?: string;
  query?: string;
  types?: readonly { value: EntryType; label: string }[];
}

function buildHref(params: { q?: string; type?: string; tag?: string }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.type) sp.set("type", params.type);
  if (params.tag) sp.set("tag", params.tag);
  const qs = sp.toString();
  return qs ? `/readings?${qs}` : "/readings";
}

function pillClasses(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-muted-foreground hover:border-primary/40"
  );
}

export function FilterBar({ activeType, activeTag, query, types = ENTRY_TYPES }: FilterBarProps) {
  const hasFilters = Boolean(activeType || activeTag);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={buildHref({ q: query, tag: activeTag })} className={pillClasses(!activeType)}>
        All types
      </Link>
      {types.map((t) => (
        <Link
          key={t.value}
          href={buildHref({ q: query, type: activeType === t.value ? undefined : t.value, tag: activeTag })}
          className={pillClasses(activeType === t.value)}
        >
          {t.label}
        </Link>
      ))}

      {activeTag ? (
        <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Tag: {activeTag}
          <Link
            href={buildHref({ q: query, type: activeType })}
            className="text-primary/60 hover:text-primary"
            aria-label="Clear tag filter"
          >
            ×
          </Link>
        </span>
      ) : null}

      {hasFilters ? (
        <Link href={buildHref({ q: query })} className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          Clear filters
        </Link>
      ) : null}
    </div>
  );
}
