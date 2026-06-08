import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EntryCard } from "@/components/entry-card";
import { FilterBar } from "@/components/filter-bar";
import { SubjectCard } from "@/components/subject-card";
import { fetchDriveSubjectNames } from "@/lib/drive-sync/client";
import { fetchEntries, fetchSubjects, type SubjectSummary } from "@/lib/queries";
import { ENTRY_TYPES } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const BRIEFING_TYPES = ENTRY_TYPES.filter((t) => t.value !== "study_notes");

// Subjects come from synced notes, but a course folder in Drive should show
// up the moment it exists — even before any notes have been synced from it.
// Drive-only entries get zeroed counts and a null date, sorted alphabetically
// after the subjects that already have notes.
function withDriveOnlySubjects(subjects: SubjectSummary[], driveNames: string[] | null): SubjectSummary[] {
  if (!driveNames || driveNames.length === 0) return subjects;

  const known = new Set(subjects.map((s) => s.subject));
  const driveOnly: SubjectSummary[] = driveNames
    .filter((name) => !known.has(name))
    .map((name) => ({ subject: name, sessionCount: 0, entryCount: 0, latestDate: null }));

  if (driveOnly.length === 0) return subjects;

  return [...subjects, ...driveOnly].sort((a, b) => {
    if (a.latestDate && b.latestDate) return b.latestDate.localeCompare(a.latestDate);
    if (a.latestDate) return -1;
    if (b.latestDate) return 1;
    return a.subject.localeCompare(b.subject);
  });
}

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

  const [subjects, driveSubjectNames, briefingEntries] = await Promise.all([
    fetchSubjects(supabase),
    fetchDriveSubjectNames(),
    fetchEntries(supabase, { excludeType: "study_notes" }),
  ]);

  const allSubjects = withDriveOnlySubjects(subjects, driveSubjectNames);

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
        {allSubjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            No study notes yet. Add one with type &quot;Study Notes&quot; to start building out your courses.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allSubjects.map((subject) => (
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
