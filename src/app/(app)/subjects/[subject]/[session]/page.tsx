import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EntryCard } from "@/components/entry-card";
import { fetchEntriesBySession } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ subject: string; session: string }>;
}) {
  const { subject: subjectParam, session: sessionParam } = await params;
  const subject = decodeURIComponent(subjectParam);
  const session = decodeURIComponent(sessionParam);

  const supabase = await createClient();
  const entries = await fetchEntriesBySession(supabase, subject, session);

  if (entries.length === 0) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: subject, href: `/subjects/${encodeURIComponent(subject)}` },
          { label: session },
        ]}
      />

      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">{session}</h1>
        <p className="text-sm text-neutral-500">{plural(entries.length, "note")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
