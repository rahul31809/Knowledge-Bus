import Link from "next/link";
import { notFound } from "next/navigation";
import { sanitizeBodyHtml } from "@/lib/sanitize";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
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
      <div className="flex items-center justify-between gap-4">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: entry.title }]} />
        <EntryActions entryId={entry.id} title={entry.title} onDelete={deleteEntry.bind(null, entry.id)} />
      </div>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={TYPE_BADGE_VARIANT[entry.entry_type] ?? "outline"}>
            {entryTypeLabel(entry.entry_type)}
          </Badge>
          <span className="text-sm text-muted-foreground">{formatEntryDate(entry.entry_date)}</span>
          {entry.source_routine ? (
            <span className="text-sm text-muted-foreground">· {entry.source_routine}</span>
          ) : null}
        </div>

        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{entry.title}</h1>

        {entry.summary ? <p className="text-base text-muted-foreground">{entry.summary}</p> : null}

        {entry.subject_tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {entry.subject_tags.map((tag) => (
              <Link key={tag} href={`/readings?tag=${encodeURIComponent(tag)}`}>
                <Badge
                  variant="ghost"
                  className="border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <div
        className="prose prose-neutral dark:prose-invert max-w-none rounded-lg border border-border bg-card p-6 prose-headings:font-semibold prose-a:text-primary"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </article>
  );
}
