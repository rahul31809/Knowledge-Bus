import Link from "next/link";
import { BookmarkIcon, GraduationCapIcon, NewspaperIcon, RssIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DashboardSection } from "@/components/dashboard-section";
import { EntryCard } from "@/components/entry-card";
import { FilterBar } from "@/components/filter-bar";
import { SubjectCard } from "@/components/subject-card";
import { fetchDriveSubjectNames } from "@/lib/drive-sync/client";
import { fetchEntries, fetchMagazineArticlesByCategory, fetchSubjects, type SubjectSummary } from "@/lib/queries";
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

  const [subjects, driveSubjectNames, categories, briefingEntries] = await Promise.all([
    fetchSubjects(supabase),
    fetchDriveSubjectNames().catch(() => null),
    fetchMagazineArticlesByCategory(supabase),
    fetchEntries(supabase, hasFilters ? { query: q, entryType: type, tag } : { excludeType: "study_notes" }),
  ]);

  const allSubjects = withDriveOnlySubjects(subjects, driveSubjectNames);

  const allArticles = categories.flatMap((group) => group.articles);
  const unreadArticles = allArticles.filter((a) => !a.isRead);
  const previewArticles = unreadArticles.slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Your Knowledge Base</h1>
          <p className="text-sm text-neutral-500">
            {allSubjects.length} subjects · {allArticles.length} articles
            {allArticles.length > 0 ? ` (${unreadArticles.length} unread)` : ""} · {briefingEntries.length} saved
            readings
          </p>
        </div>
        <Link href="/entries/new" className={buttonVariants({ variant: "default" })}>
          Add Entry
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardSection icon={GraduationCapIcon} accent="blue" title="Subjects" meta={`${allSubjects.length} subjects`}>
          {allSubjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
              No study notes yet. Add one with type &quot;Study Notes&quot; to start building out your courses.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {allSubjects.map((subject) => (
                <SubjectCard key={subject.subject} subject={subject} />
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection
          icon={NewspaperIcon}
          accent="violet"
          title="Articles"
          meta={allArticles.length > 0 ? `${allArticles.length} articles · ${unreadArticles.length} unread` : undefined}
          viewAllHref="/magazines"
        >
          {allArticles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
              No articles yet. Run the magazine scan to populate this.
            </div>
          ) : unreadArticles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
              All caught up — {allArticles.length} articles read.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {previewArticles.map((article) => (
                <a
                  key={article.id}
                  href={article.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-0.5 rounded-md px-2 py-1.5 hover:bg-neutral-50"
                >
                  <span className="truncate text-sm text-neutral-800 group-hover:underline">{article.title}</span>
                  <span className="truncate text-xs text-neutral-400">{article.issueLabel}</span>
                </a>
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection icon={RssIcon} accent="emerald" title="Current News" viewAllHref="/news" viewAllLabel="Preview">
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            Coming soon — The Ken, Mint, Financial Times and more, refreshed daily with AI summaries.
          </div>
        </DashboardSection>

        <DashboardSection
          icon={BookmarkIcon}
          accent="amber"
          title="Reading & Briefings"
          meta={hasFilters ? `${briefingEntries.length} results` : `${briefingEntries.length} saved`}
        >
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
        </DashboardSection>
      </div>
    </div>
  );
}
