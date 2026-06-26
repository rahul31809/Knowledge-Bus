import { Breadcrumbs } from "@/components/breadcrumbs";
import { EntryCard } from "@/components/entry-card";
import { FilterBar } from "@/components/filter-bar";
import { fetchEntries } from "@/lib/queries";
import { ENTRY_TYPES } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const BRIEFING_TYPES = ENTRY_TYPES.filter((t) => t.value !== "study_notes");

export default async function ReadingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; tag?: string }>;
}) {
  const { q, type, tag } = await searchParams;
  const supabase = await createClient();
  const hasFilters = Boolean(q || type || tag);

  const entries = await fetchEntries(
    supabase,
    hasFilters ? { query: q, entryType: type, tag } : { excludeType: "study_notes" }
  );

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Reading & Briefings" }]} />

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reading & Briefings</h1>
        <p className="text-sm text-muted-foreground">{hasFilters ? `${entries.length} results` : `${entries.length} saved`}</p>
      </div>

      <FilterBar types={BRIEFING_TYPES} activeType={type} activeTag={tag} query={q} />

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No readings or briefings saved yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
