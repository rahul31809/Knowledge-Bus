import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EntryCard } from "@/components/entry-card";
import { FilterBar } from "@/components/filter-bar";
import { SubjectCard } from "@/components/subject-card";
import { fetchEntries, fetchSubjects } from "@/lib/queries";
import { ENTRY_TYPES } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const BRIEFING_TYPES = ENTRY_TYPES.filter((t) => t.value !== "study_notes");

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; tag?: string }>;
}) {
  const { q, type, tag } = await searchParams;
  const supabase = await createClient();
  const hasFilters = Boolean(q || type || tag);

  if (hasFilters) {
    const entries = await fetchEntries(supabase, { query: q, entryType: type, tag });
    const heading = q ? `Search: "${q}"` : tag ? `Tag: ${tag}` : "Filtered results";

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">{heading}</h1>
            <p className="text-sm text-neutral-500">
              {entries.length} {entries.length === 1 ? "result" : "results"}
            </p>
          </div>
          <Link href="/entries/new" className={buttonVariants({ variant: "default" })}>
            Add Entry
          </Link>
        </div>

        <FilterBar activeType={type} activeTag={tag} query={q} />

        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
            No entries match these filters. Try clearing one and searching again.
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

  const [subjects, briefingEntries] = await Promise.all([
    fetchSubjects(supabase),
    fetchEntries(supabase, { excludeType: "study_notes" }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Your Knowledge Base</h1>
          <p className="text-sm text-neutral-500">Browse by course, or scan your saved readings and briefings.</p>
        </div>
        <Link href="/entries/new" className={buttonVariants({ variant: "default" })}>
          Add Entry
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Subjects</h2>
        {subjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            No study notes yet. Add one with type &quot;Study Notes&quot; to start building out your courses.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <SubjectCard key={subject.subject} subject={subject} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Reading &amp; Briefings</h2>
        <FilterBar types={BRIEFING_TYPES} activeType={type} activeTag={tag} query={q} />

        {briefingEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            No readings or briefings saved yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {briefingEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
