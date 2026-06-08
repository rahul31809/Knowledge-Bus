import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SessionCard } from "@/components/session-card";
import { fetchSessions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject: subjectParam } = await params;
  const subject = decodeURIComponent(subjectParam);

  const supabase = await createClient();
  const sessions = await fetchSessions(supabase, subject);

  if (sessions.length === 0) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: subject }]} />

      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">{subject}</h1>
        <p className="text-sm text-neutral-500">{plural(sessions.length, "session")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <SessionCard key={session.session_label} subject={subject} session={session} />
        ))}
      </div>
    </div>
  );
}
