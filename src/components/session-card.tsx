import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { SessionSummary } from "@/lib/queries";
import { formatEntryDate } from "@/lib/types";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function SessionCard({ subject, session }: { subject: string; session: SessionSummary }) {
  return (
    <Link
      href={`/subjects/${encodeURIComponent(subject)}/${encodeURIComponent(session.session_label)}`}
      className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground group-hover:underline">{session.session_label}</h3>
        <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{plural(session.entryCount, "note")}</p>
      <p className="text-xs text-muted-foreground">Last updated {formatEntryDate(session.latestDate)}</p>
    </Link>
  );
}
