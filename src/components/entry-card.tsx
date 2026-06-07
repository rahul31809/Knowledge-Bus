import Link from "next/link";
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
    <div className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300">
      <Link href={`/entries/${entry.id}`} className="block">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={TYPE_BADGE_VARIANT[entry.entry_type] ?? "outline"}>{entryTypeLabel(entry.entry_type)}</Badge>
          <span className="text-xs text-neutral-500">{formatEntryDate(entry.entry_date)}</span>
          {entry.source_routine ? (
            <span className="text-xs text-neutral-400">· {entry.source_routine}</span>
          ) : null}
        </div>

        <h2 className="mt-2 text-lg font-semibold text-neutral-900 hover:underline">{entry.title}</h2>

        {snippet ? <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{snippet}</p> : null}
      </Link>

      {entry.subject_tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
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
    </div>
  );
}
