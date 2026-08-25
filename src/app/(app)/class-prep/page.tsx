import { ChevronRightIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DriveFileLink } from "@/components/drive-file-link";
import { fetchDriveFileTagsForSubject, fetchUpcomingSessions } from "@/lib/queries";
import type { UpcomingSession } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { SyncNowButton } from "./sync-button";

function formatDateHeading(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const isCurrentYear = date.getFullYear() === today.getFullYear();
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: isCurrentYear ? undefined : "numeric",
  });
}

// Extracts the start time (e.g. "9:00 AM" from "9:00 AM - 11:40 AM") as
// minutes-since-midnight for chronological sorting — a plain string sort
// would put "9:00 AM" after "12:00 PM" and "2:30 PM" since "9" > "1" > "2"
// as the first character. Sessions with no parseable time sort last within
// their date rather than disrupting the rest of the order.
function parseStartMinutes(time: string | null): number {
  const match = time?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function groupByDate(sessions: UpcomingSession[]): { date: string; sessions: UpcomingSession[] }[] {
  const map = new Map<string, UpcomingSession[]>();
  for (const session of sessions) {
    const group = map.get(session.eventDate) ?? [];
    group.push(session);
    map.set(session.eventDate, group);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sessions]) => ({
      date,
      sessions: [...sessions].sort((a, b) => parseStartMinutes(a.eventTime) - parseStartMinutes(b.eventTime)),
    }));
}

interface FileData {
  tags: string[];
  summary: string | null;
}

function SessionRow({ session, fileDataMap }: { session: UpcomingSession; fileDataMap: Map<string, FileData> }) {
  if (!session.subject) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-muted-foreground">{session.eventTitle}</span>
          {session.eventTime ? <span className="text-xs text-muted-foreground/70">{session.eventTime}</span> : null}
        </div>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground/60">Subject not identified</span>
      </div>
    );
  }

  const meta = [session.eventTime, session.sessionLabel, session.sector].filter(Boolean).join(" · ");

  if (session.files.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">{session.subject}</span>
          {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
        </div>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground/60">No pre-reads found</span>
      </div>
    );
  }

  return (
    <details name="class-prep-session" className="group/session">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-accent [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/session:rotate-90" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">{session.subject}</span>
          {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {session.files.length} pre-read{session.files.length === 1 ? "" : "s"}
        </span>
      </summary>
      <div className="flex flex-col gap-0.5 pb-2">
        {session.files.map((file) => (
          <DriveFileLink
            key={file.id}
            file={file}
            subject={session.subject!}
            tags={fileDataMap.get(file.id)?.tags ?? []}
            initialSummary={fileDataMap.get(file.id)?.summary ?? null}
            indentPx={28}
          />
        ))}
      </div>
    </details>
  );
}

export default async function ClassPrepPage() {
  const supabase = await createClient();
  const sessions = await fetchUpcomingSessions(supabase);
  const dateGroups = groupByDate(sessions);

  const subjects = [...new Set(sessions.map((s) => s.subject).filter((s): s is string => s !== null))];
  const tagsBySubject = await Promise.all(subjects.map((subject) => fetchDriveFileTagsForSubject(supabase, subject)));
  const fileDataMap = new Map<string, FileData>(
    tagsBySubject.flat().map((t) => [t.file_id, { tags: t.tags, summary: t.ai_summary }])
  );

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Class Prep" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Class Prep</h1>
          <p className="text-sm text-muted-foreground">
            This week&apos;s sessions, synced from your institute calendar, with linked pre-reads from Drive.
          </p>
        </div>
        <SyncNowButton />
      </div>

      {dateGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No upcoming sessions synced yet — check back after the next calendar sync.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {dateGroups.map(({ date, sessions }) => (
            <div key={date} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border bg-muted/40 px-4 py-2.5">
                <h2 className="text-sm font-semibold text-foreground">{formatDateHeading(date)}</h2>
              </div>
              <div className="divide-y divide-border">
                {sessions.map((session) => (
                  <SessionRow key={`${session.eventDate}-${session.eventTitle}`} session={session} fileDataMap={fileDataMap} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
