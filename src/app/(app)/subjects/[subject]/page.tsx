import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SessionCard } from "@/components/session-card";
import { SubjectDriveFiles } from "@/components/subject-drive-files";
import { buttonVariants } from "@/components/ui/button";
import { fetchSubjectDriveResources, type SubjectDriveLookup } from "@/lib/drive-sync/client";
import { fetchDriveFileTagsForSubject, fetchSessions, fetchSubjectProfile } from "@/lib/queries";
import { UNSORTED_LABEL, type SubjectProfile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

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
  const [sessions, profile, drive, driveTags] = await Promise.all([
    fetchSessions(supabase, subject).catch(() => [] as Awaited<ReturnType<typeof fetchSessions>>),
    fetchSubjectProfile(supabase, subject).catch(() => null),
    fetchSubjectDriveResources(subject).catch(
      (): SubjectDriveLookup => ({ status: "unavailable" })
    ),
    fetchDriveFileTagsForSubject(supabase, subject).catch(() => [] as Awaited<ReturnType<typeof fetchDriveFileTagsForSubject>>),
  ]);

  // A subject is real if it has synced notes OR a matching Drive folder.
  // "unavailable" (Drive unreachable/unconfigured) never triggers a 404 on
  // its own — that would 404 real subjects whenever Drive has a hiccup.
  if (sessions.length === 0 && drive.status !== "found") notFound();

  const driveFiles = drive.status === "found" ? drive.files : null;
  const tagMap = new Map(driveTags.map((t) => [t.file_id, t.tags]));

  const sections = PROFILE_SECTIONS.map((section) => ({ ...section, value: profile?.[section.key] as string | null }))
    .filter((section) => section.value);

  const canEditInfo = subject !== UNSORTED_LABEL;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: subject }]} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{subject}</h1>
          <p className="text-sm text-neutral-500">{plural(sessions.length, "session")}</p>
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
            <div key={section.key} className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-neutral-900">{section.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">{section.value}</p>
            </div>
          ))}
        </div>
      ) : canEditInfo ? (
        <Link
          href={`/subjects/${encodeURIComponent(subject)}/edit`}
          className="rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-700"
        >
          No course overview, outline, frameworks, or revision highlights yet — add subject info.
        </Link>
      ) : null}

      {canEditInfo ? <SubjectDriveFiles groups={driveFiles} tagMap={tagMap} /> : null}

      {sessions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard key={session.session_label} subject={subject} session={session} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          No synced session notes for this subject yet — they&apos;ll show up here once added.
        </div>
      )}
    </div>
  );
}
