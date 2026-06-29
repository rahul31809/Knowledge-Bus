import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SessionCard } from "@/components/session-card";
import { SubjectDriveFiles } from "@/components/subject-drive-files";
import { buttonVariants } from "@/components/ui/button";
import { fetchDriveSubjectsByCategory, fetchSubjectDriveResources, type SubjectDriveLookup } from "@/lib/drive-sync/client";
import { fetchDriveFileTagsForSubject, fetchSessions, fetchSubjectProfile } from "@/lib/queries";
import { UNSORTED_LABEL, type SubjectProfile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

// Drive file listings must never be served stale — newly added files should
// show up on the next visit, not after some cache window expires.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

const PROFILE_SECTIONS: { key: keyof SubjectProfile; title: string }[] = [
  { key: "overview", title: "Overview" },
  { key: "course_outline", title: "Course outline" },
  { key: "frameworks", title: "Important frameworks" },
  { key: "revision_highlights", title: "Revision highlights" },
];

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject: subjectParam } = await params;
  const subject = decodeURIComponent(subjectParam);

  const supabase = await createClient();
  const [sessions, profile, drive, driveTags, categories] = await Promise.all([
    fetchSessions(supabase, subject).catch(() => [] as Awaited<ReturnType<typeof fetchSessions>>),
    fetchSubjectProfile(supabase, subject).catch(() => null),
    fetchSubjectDriveResources(subject).catch(
      (): SubjectDriveLookup => ({ status: "unavailable" })
    ),
    fetchDriveFileTagsForSubject(supabase, subject).catch(() => [] as Awaited<ReturnType<typeof fetchDriveFileTagsForSubject>>),
    fetchDriveSubjectsByCategory().catch(() => null),
  ]);

  // A subject is real if it has synced notes OR a matching Drive folder.
  // "unavailable" (Drive unreachable/unconfigured) never triggers a 404 on
  // its own — that would 404 real subjects whenever Drive has a hiccup.
  if (sessions.length === 0 && drive.status !== "found") notFound();

  const category = categories?.find((c) => c.subjects.some((s) => s.name === subject)) ?? null;

  const driveFiles = drive.status === "found" ? drive.files : null;
  const fileDataMap = new Map(driveTags.map((t) => [t.file_id, { tags: t.tags, summary: t.ai_summary }]));

  const sections = PROFILE_SECTIONS.map((section) => ({ ...section, value: profile?.[section.key] as string | null }))
    .filter((section) => section.value);

  const canEditInfo = subject !== UNSORTED_LABEL;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "MBA Study Materials", href: "/subjects" },
          ...(category
            ? [{ label: category.category, href: `/subjects?term=${encodeURIComponent(category.category)}` }]
            : []),
          { label: subject },
        ]}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{subject}</h1>
          <p className="text-sm text-muted-foreground">{plural(sessions.length, "session")}</p>
        </div>
        {canEditInfo ? (
          <Link
            href={`/subjects/${encodeURIComponent(subject)}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <PencilIcon className="size-3.5" />
            {profile ? "Edit info" : "Add subject info"}
          </Link>
        ) : null}
      </div>

      {sections.length > 0 ? (
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <div key={section.key} className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{section.value}</p>
            </div>
          ))}
        </div>
      ) : canEditInfo ? (
        <Link
          href={`/subjects/${encodeURIComponent(subject)}/edit`}
          className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          No course overview, outline, frameworks, or revision highlights yet — add subject info.
        </Link>
      ) : null}

      {canEditInfo ? <SubjectDriveFiles groups={driveFiles} subject={subject} fileDataMap={fileDataMap} /> : null}

      {sessions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard key={session.session_label} subject={subject} session={session} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No synced session notes for this subject yet — they&apos;ll show up here once added.
        </div>
      )}
    </div>
  );
}
