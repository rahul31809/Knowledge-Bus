import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { SubjectSummary } from "@/lib/queries";

export function SubjectCard({ subject }: { subject: SubjectSummary }) {
  return (
    <Link
      href={`/subjects/${encodeURIComponent(subject.subject)}`}
      className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <h3 className="text-base font-semibold text-foreground group-hover:underline">{subject.subject}</h3>
      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </Link>
  );
}
