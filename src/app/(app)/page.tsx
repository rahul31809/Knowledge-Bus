import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EntryCard } from "@/components/entry-card";
import { FilterBar } from "@/components/filter-bar";
import { fetchEntries } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; tag?: string }>;
}) {
  const { q, type, tag } = await searchParams;
  const supabase = await createClient();
  const entries = await fetchEntries(supabase, { query: q, entryType: type, tag });

  const hasFilters = Boolean(q || type || tag);
  const heading = q ? `Search: "${q}"` : tag ? `Tag: ${tag}` : "Your Knowledge Base";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{heading}</h1>
          <p className="text-sm text-neutral-500">
            {hasFilters
              ? `${entries.length} ${entries.length === 1 ? "result" : "results"}`
              : "Browse, filter and search everything you've saved."}
          </p>
        </div>
        <Link href="/entries/new" className={buttonVariants({ variant: "default" })}>
          Add Entry
        </Link>
      </div>

      <FilterBar activeType={type} activeTag={tag} query={q} />

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
          {hasFilters ? (
            <>No entries match these filters. Try clearing one and searching again.</>
          ) : (
            <>
              No entries yet. Click <span className="font-medium text-neutral-700">Add Entry</span> to save your first
              note.
            </>
          )}
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
