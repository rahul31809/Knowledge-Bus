"use client";

import { useState } from "react";
import {
  ExternalLinkIcon,
  FileIcon,
  FileImageIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileVideoIcon,
  Loader2Icon,
  PresentationIcon,
  SparklesIcon,
} from "lucide-react";
import { Markdown } from "@/components/industry-primer/markdown";
import type { DriveFileEntry } from "@/lib/drive-sync/client";

const FILE_TYPE_ICONS: { test: (mimeType: string) => boolean; icon: typeof FileIcon; className: string }[] = [
  { test: (m) => m === "application/pdf", icon: FileTextIcon, className: "text-red-500 dark:text-red-400" },
  {
    test: (m) => m === "application/vnd.google-apps.presentation" || m.includes("presentationml"),
    icon: PresentationIcon,
    className: "text-orange-500 dark:text-orange-400",
  },
  {
    test: (m) => m === "application/vnd.google-apps.spreadsheet" || m.includes("spreadsheetml"),
    icon: FileSpreadsheetIcon,
    className: "text-emerald-500 dark:text-emerald-400",
  },
  {
    test: (m) => m === "application/vnd.google-apps.document" || m.includes("wordprocessingml"),
    icon: FileTextIcon,
    className: "text-blue-500 dark:text-blue-400",
  },
  { test: (m) => m.startsWith("image/"), icon: FileImageIcon, className: "text-violet-500 dark:text-violet-400" },
  { test: (m) => m.startsWith("video/"), icon: FileVideoIcon, className: "text-pink-500 dark:text-pink-400" },
];

function fileIconFor(mimeType: string) {
  return FILE_TYPE_ICONS.find((entry) => entry.test(mimeType)) ?? {
    icon: FileIcon,
    className: "text-muted-foreground",
  };
}

function TagChip({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {tag}
    </span>
  );
}

export function DriveFileLink({
  file,
  subject,
  tags,
  initialSummary,
  indentPx,
}: {
  file: DriveFileEntry;
  subject: string;
  tags: string[];
  initialSummary: string | null;
  indentPx: number;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { icon: Icon, className } = fileIconFor(file.mimeType);

  async function handleSummarize(e: React.MouseEvent) {
    e.preventDefault();
    if (summary) {
      setShowSummary((prev) => !prev);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/drive-files/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          fileName: file.name,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink,
          subject,
        }),
      });
      const data = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok || !data.summary) throw new Error(data.error ?? "Failed to generate summary");
      setSummary(data.summary);
      setShowSummary(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md py-2 pr-2 transition-colors hover:bg-accent" style={{ paddingLeft: indentPx }}>
      <div className="flex items-center gap-2">
        <Icon className={`size-4 shrink-0 ${className}`} />
        <a
          href={file.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          {file.name}
        </a>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleSummarize}
            disabled={loading}
            title={summary ? (showSummary ? "Hide summary" : "View summary") : "Generate AI summary"}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {loading ? <Loader2Icon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5" />}
            {loading ? "Summarizing…" : summary ? "Summary" : "Summarize"}
          </button>
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-muted hover:text-foreground"
            title="Open in Drive"
          >
            <ExternalLinkIcon className="size-3.5" />
          </a>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-6">
          {tags.map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
        </div>
      )}

      {error ? <p className="pl-6 text-xs text-destructive">{error}</p> : null}

      {showSummary && summary ? (
        <div className="ml-6 mt-1 max-w-2xl rounded-md border border-border bg-muted/50 p-3">
          <Markdown>{summary}</Markdown>
        </div>
      ) : null}
    </div>
  );
}
