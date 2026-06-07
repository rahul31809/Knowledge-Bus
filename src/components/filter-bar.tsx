import Link from "next/link";
import { ENTRY_TYPES } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  activeType?: string;
  activeTag?: string;
  query?: string;
}

function buildHref(params: { q?: string; type?: string; tag?: string }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.type) sp.set("type", params.type);
  if (params.tag) sp.set("tag", params.tag);
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

function pillClasses(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
    active
      ? "border-neutral-900 bg-neutral-900 text-white"
      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
  );
}

export function FilterBar({ activeType, activeTag, query }: FilterBarProps) {
  const hasFilters = Boolean(activeType || activeTag);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={buildHref({ q: query, tag: activeTag })} className={pillClasses(!activeType)}>
        All types
      </Link>
      {ENTRY_TYPES.map((t) => (
        <Link
          key={t.value}
          href={buildHref({ q: query, type: activeType === t.value ? undefined : t.value, tag: activeTag })}
          className={pillClasses(activeType === t.value)}
        >
          {t.label}
        </Link>
      ))}

      {activeTag ? (
        <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Tag: {activeTag}
          <Link
            href={buildHref({ q: query, type: activeType })}
            className="text-blue-400 hover:text-blue-700"
            aria-label="Clear tag filter"
          >
            ×
          </Link>
        </span>
      ) : null}

      {hasFilters ? (
        <Link href={buildHref({ q: query })} className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-700 hover:underline">
          Clear filters
        </Link>
      ) : null}
    </div>
  );
}
