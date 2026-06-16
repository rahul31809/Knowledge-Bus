import { ExternalLinkIcon } from "lucide-react";
import { googleSearchLink } from "@/lib/google-search-link";

export function SourceLink({ query, children }: { query: string; children: React.ReactNode }) {
  return (
    <a
      href={googleSearchLink(query)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 hover:underline"
    >
      {children}
      <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground/50" />
    </a>
  );
}
