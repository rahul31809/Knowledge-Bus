import Link from "next/link";
import { notFound } from "next/navigation";
import { sanitizeBodyHtml } from "@/lib/sanitize";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EntryActions } from "@/components/entry-actions";
import { entryTypeLabel, formatEntryDate } from "@/lib/types";
import { fetchEntryById } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { deleteEntry } from "./actions";

const TYPE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  study_notes: "default",
  industry_briefing: "secondary",
  energy_scan: "secondary",
  ppt_notes: "outline",
  other: "outline",
};

export default async function EntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const entry = await fetchEntryById(supabase, id);

  if (!entry) notFound();

  const safeHtml = sanitizeBodyHtml(entry.body_html);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800">
          <ArrowLeftIcon className="size-3.5" />
          Back to Knowledge Base
        </Link>
        <EntryActions entryId={entry.id} title={entry.title} onDelete={deleteEntry.bind(null, entry.id)} />
      </div>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={TYPE_BADGE_VARIANT[entry.entry_type] ?? "outline"}>
            {entryTypeLabel(entry.entry_type)}
          </Badge>
          <span className="text-sm text-neutral-500">{formatEntryDate(entry.entry_date)}</span>
          {entry.source_routine ? (
            <span className="text-sm text-neutral-400">· {entry.source_routine}</span>
          ) : null}
        </div>

        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">{entry.title}</h1>

        {entry.summary ? <p className="text-base text-neutral-600">{entry.summary}</p> : null}

        {entry.subject_tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {entry.subject_tags.map((tag) => (
              <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`}>
                <Badge
                  variant="ghost"
                  className="border border-neutral-200 text-neutral-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <div
        className="prose prose-neutral max-w-none rounded-lg border border-neutral-200 bg-white p-6 prose-headings:font-semibold prose-a:text-blue-600"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </article>
  );
}
