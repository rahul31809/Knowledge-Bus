"use client";

import { useState } from "react";
import { ExternalLinkIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DriveFileTag } from "@/lib/types";

export function WordOfTheDay({ word, article }: { word: string; article: DriveFileTag }) {
  const [summary, setSummary] = useState<string | null>(article.ai_summary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/article-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: article.file_id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to generate summary");
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">Word of the Day</h2>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          {word}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-0.5">
        <a
          href={article.web_view_link}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-1.5 text-sm font-medium text-neutral-800 hover:underline"
        >
          <span className="truncate">{article.file_name}</span>
          <ExternalLinkIcon className="size-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-600" />
        </a>
        <p className="text-xs text-neutral-500">{article.subject}</p>
      </div>

      {summary ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-600">{summary}</p>
      ) : (
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={handleGenerate} disabled={loading}>
            <SparklesIcon className="size-3.5" />
            {loading ? "Generating..." : "Generate AI Summary"}
          </Button>
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        </div>
      )}
    </section>
  );
}
