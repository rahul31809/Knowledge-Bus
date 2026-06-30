import Link from "next/link";
import { BookmarkIcon, Building2Icon, GraduationCapIcon, NewspaperIcon, RssIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard-card";
import { GreetingHeading } from "@/components/greeting-heading";
import { fetchDriveSubjectNames } from "@/lib/drive-sync/client";
import { INDUSTRY_TAXONOMY } from "@/lib/industry-taxonomy";
import {
  fetchEntries,
  fetchMagazineArticlesByCategory,
  fetchNewsArticlesByCategory,
  fetchRecentEntries,
  fetchSubjects,
  withDriveOnlySubjects,
} from "@/lib/queries";
import { entryTypeLabel, formatEntryDate } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function BrowsePage() {
  const supabase = await createClient();

  const [subjects, driveSubjectNames, categories, briefingEntries, newsCategories, recentEntries] = await Promise.all([
    fetchSubjects(supabase),
    fetchDriveSubjectNames().catch(() => null),
    fetchMagazineArticlesByCategory(supabase),
    fetchEntries(supabase, { excludeType: "study_notes" }),
    fetchNewsArticlesByCategory(supabase),
    fetchRecentEntries(supabase, 3),
  ]);

  const allSubjects = withDriveOnlySubjects(subjects, driveSubjectNames);

  const allArticles = categories.flatMap((group) => group.articles);
  const unreadArticles = allArticles.filter((a) => !a.isRead);

  const allNewsArticles = newsCategories.flatMap((group) => group.articles);
  const unreadNewsArticles = allNewsArticles.filter((a) => !a.isRead);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <GreetingHeading name="Rahul" />
            <p className="mt-2 text-sm text-indigo-100 sm:text-base">
              {allSubjects.length} subjects · {allArticles.length} articles
              {allArticles.length > 0 ? ` (${unreadArticles.length} unread)` : ""} · {briefingEntries.length} saved
              readings
            </p>
          </div>
          <Link
            href="/entries/new"
            className={cn(buttonVariants({ variant: "default" }), "shrink-0 bg-white text-indigo-700 shadow-sm hover:bg-indigo-50")}
          >
            Add Entry
          </Link>
        </div>
      </div>

      {recentEntries.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Continue where you left off</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {recentEntries.map((entry) => (
              <Link
                key={entry.id}
                href={`/entries/${entry.id}`}
                className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{entryTypeLabel(entry.entry_type)}</span>
                  <span>·</span>
                  <span>{formatEntryDate(entry.entry_date)}</span>
                </div>
                <p className="line-clamp-1 text-sm font-medium text-foreground">{entry.title}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardCard
          href="/subjects"
          icon={GraduationCapIcon}
          accent="blue"
          title="MBA Study Materials"
          description="Course materials organized by term"
          meta={`${allSubjects.length} subjects`}
          size="featured"
          className="animate-fade-in-up sm:col-span-2"
          style={{ animationDelay: "0ms" }}
        />

        <DashboardCard
          href="/industries"
          icon={Building2Icon}
          accent="indigo"
          title="Industries"
          description="AI-generated consultant-style primers across sectors and sub-sectors"
          meta={`${INDUSTRY_TAXONOMY.length} sectors`}
          size="featured"
          className="animate-fade-in-up"
          style={{ animationDelay: "60ms" }}
        />

        <DashboardCard
          href="/magazines"
          icon={NewspaperIcon}
          accent="violet"
          title="Articles"
          description="Picks from the tables of contents of your magazine issues"
          meta={allArticles.length > 0 ? `${allArticles.length} articles · ${unreadArticles.length} unread` : undefined}
          className="animate-fade-in-up"
          style={{ animationDelay: "120ms" }}
        />

        <DashboardCard
          href="/news"
          icon={RssIcon}
          accent="emerald"
          title="Current News"
          description="Markets, business and energy news — refreshed daily"
          meta={
            allNewsArticles.length > 0
              ? `${allNewsArticles.length} articles · ${unreadNewsArticles.length} unread`
              : "No articles yet"
          }
          className="animate-fade-in-up"
          style={{ animationDelay: "180ms" }}
        />

        <DashboardCard
          href="/readings"
          icon={BookmarkIcon}
          accent="amber"
          title="Reading & Briefings"
          description="Saved notes, industry briefings and PPT takeaways"
          meta={`${briefingEntries.length} saved`}
          className="animate-fade-in-up"
          style={{ animationDelay: "240ms" }}
        />
      </div>
    </div>
  );
}
