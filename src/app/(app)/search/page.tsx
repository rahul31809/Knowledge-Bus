import Link from "next/link";
import { ExternalLinkIcon, FileTextIcon, SearchIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EntryCard } from "@/components/entry-card";
import { fetchEntries, searchDriveFiles } from "@/lib/queries";
import type { DriveFileTag } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

function DriveFileCard({ file }: { file: DriveFileTag }) {
  return (
    <a
      href={file.web_view_link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-2">
        <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-foreground group-hover:underline">{file.file_name}</span>
          <span className="text-xs text-muted-foreground">{file.subject}</span>
        </div>
        <ExternalLinkIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
      </div>
      {file.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {file.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const supabase = await createClient();

  const [driveFiles, knowledgeEntries] = query
    ? await Promise.all([
        searchDriveFiles(supabase, query),
        fetchEntries(supabase, { query }),
      ])
    : [[], []];

  const totalResults = driveFiles.length + knowledgeEntries.length;

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Search</h1>
        <p className="text-sm text-muted-foreground">
          Searches Drive files by tag or filename, and your saved notes by content.
        </p>
      </div>

      <form method="GET" action="/search" className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by tag (e.g. porter-five-forces) or keyword…"
            className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-4 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring"
            autoFocus={!query}
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Search
        </button>
      </form>

      {query && (
        <p className="text-sm text-muted-foreground">
          {totalResults} {totalResults === 1 ? "result" : "results"} for &ldquo;{query}&rdquo;
        </p>
      )}

      {query && driveFiles.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            Drive files{" "}
            <span className="text-sm font-normal text-muted-foreground">({driveFiles.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {driveFiles.map((file) => (
              <DriveFileCard key={file.file_id} file={file} />
            ))}
          </div>
        </section>
      )}

      {query && knowledgeEntries.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            Notes &amp; readings{" "}
            <span className="text-sm font-normal text-muted-foreground">({knowledgeEntries.length})</span>
          </h2>
          <div className="flex flex-col gap-3">
            {knowledgeEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}

      {query && totalResults === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No results for &ldquo;{query}&rdquo;. Try a different tag or keyword.
          <br />
          <span className="mt-1 block text-xs text-muted-foreground">
            Drive files need to be tagged first — call{" "}
            <code className="rounded bg-muted px-1">/api/tag-drive-files</code> to run the AI tagger.
          </span>
        </div>
      )}

      {!query && (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Enter a tag (e.g. <Link href="/search?q=strategy" className="underline">strategy</Link>) or keyword to search across all your Drive files and notes.
        </div>
      )}
    </div>
  );
}
