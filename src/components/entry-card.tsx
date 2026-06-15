import Link from "next/link";
import { FolderSyncIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { entryTypeLabel, formatEntryDate, type KnowledgeEntry } from "@/lib/types";

const TYPE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  study_notes: "default",
  industry_briefing: "secondary",
  energy_scan: "secondary",
  ppt_notes: "outline",
  other: "outline",
};

export function EntryCard({ entry }: { entry: KnowledgeEntry }) {
  const snippet = entry.summary || entry.body_text.slice(0, 220);

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <Link href={`/entries/${entry.id}`} className="block">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={TYPE_BADGE_VARIANT[entry.entry_type] ?? "outline"}>{entryTypeLabel(entry.entry_type)}</Badge>
          <span className="text-xs text-muted-foreground">{formatEntryDate(entry.entry_date)}</span>
          {entry.source_routine ? (
            <span className="text-xs text-muted-foreground">· {entry.source_routine}</span>
          ) : null}
          {entry.drive_file_id ? (
            <span
              className="inline-flex items-center gap-1 text-xs text-muted-foreground"
              title="Synced from Google Drive"
            >
              <FolderSyncIcon className="size-3.5" /> Synced
            </span>
          ) : null}
        </div>

        <h2 className="mt-2 text-lg font-semibold text-foreground hover:underline">{entry.title}</h2>

        {snippet ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{snippet}</p> : null}
      </Link>

      {entry.subject_tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
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
    </div>
  );
}
