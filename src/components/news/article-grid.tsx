"use client";

import { useState } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { Markdown } from "@/components/industry-primer/markdown";
import type { NewsArticle } from "@/lib/types";
import { ArticleCard } from "./article-card";

interface ArticleGridProps {
  articles: NewsArticle[];
  emptyMessage: string;
  heroCount?: number;
  showCategoryTag?: boolean;
}

export function ArticleGrid({ articles, emptyMessage, heroCount = 0, showCategoryTag = false }: ArticleGridProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSelectToggle(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
    setSummary(null);
    setError(null);
  }

  async function handleSummarize() {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: selectedId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to generate summary");
      }
      const data = (await res.json()) as { summary: string };
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (articles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const heroArticles = articles.slice(0, heroCount);
  const gridArticles = articles.slice(heroCount);
  const selectedArticle = articles.find((a) => a.id === selectedId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            {selectedArticle ? (
              <>Summarize: <span className="font-serif italic">&ldquo;{selectedArticle.title}&rdquo;</span></>
            ) : (
              "Select an article below to generate its AI summary"
            )}
          </p>
          <button
            type="button"
            onClick={handleSummarize}
            disabled={!selectedId || loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {loading ? <Loader2Icon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5" />}
            Generate AI Summary
          </button>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {summary ? (
          <div className="border-t border-border pt-3">
            <Markdown>{summary}</Markdown>
          </div>
        ) : null}
      </div>

      {heroArticles.length > 0 ? (
        <div className="flex flex-col gap-4">
          {heroArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              size="hero"
              selected={selectedId === article.id}
              onSelectToggle={handleSelectToggle}
              showCategoryTag={showCategoryTag}
            />
          ))}
        </div>
      ) : null}

      {gridArticles.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gridArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              selected={selectedId === article.id}
              onSelectToggle={handleSelectToggle}
              showCategoryTag={showCategoryTag}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
