"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRightIcon, ExternalLinkIcon, Loader2Icon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { setNewsArticleReadStatus } from "@/app/(app)/news/actions";
import { Markdown } from "@/components/industry-primer/markdown";
import { cn } from "@/lib/utils";
import type { NewsArticle, NewsCategoryGroup } from "@/lib/types";

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function ArticleRow({ article }: { article: NewsArticle }) {
  const [isRead, setIsRead] = useState(article.isRead);
  const [pending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setIsRead(checked);
    startTransition(async () => {
      try {
        await setNewsArticleReadStatus(article.id, checked);
      } catch {
        setIsRead(!checked);
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
      <input
        type="checkbox"
        checked={isRead}
        disabled={pending}
        onChange={(e) => handleToggle(e.target.checked)}
        className="size-4 shrink-0 accent-primary"
        aria-label={`Mark "${article.title}" as read`}
      />
      <a href={article.link} target="_blank" rel="noopener noreferrer" className="group flex flex-1 items-center gap-2 truncate">
        <div className="flex flex-col truncate">
          <span className={cn("truncate text-sm group-hover:underline", isRead ? "text-muted-foreground" : "text-foreground")}>
            {article.title}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {article.source}
            {article.publishedAt ? ` · ${formatRelativeTime(article.publishedAt)}` : ""}
          </span>
        </div>
        <ExternalLinkIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
      </a>
    </div>
  );
}

function CategorySection({ group }: { group: NewsCategoryGroup }) {
  const readCount = group.articles.filter((a) => a.isRead).length;
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSummarize() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: group.section }),
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

  return (
    <details className="group/category rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open/category:rotate-90" />
        {group.section}
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {readCount}/{group.articles.length} read
        </span>
      </summary>

      <div className="flex flex-col gap-1 border-t border-border p-2">
        {group.articles.map((article) => (
          <ArticleRow key={article.id} article={article} />
        ))}
      </div>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={handleSummarize}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          {loading ? <Loader2Icon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5" />}
          Generate AI Summary
        </button>

        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

        {summary ? (
          <div className="mt-3 border-t border-border pt-3">
            <Markdown>{summary}</Markdown>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function RefreshNewsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      await fetch("/api/scan-news");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={loading}
      className="inline-flex items-center gap-2 self-start rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
    >
      {loading ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
      Refresh news
    </button>
  );
}

export function NewsLibrary({ categories }: { categories: NewsCategoryGroup[] }) {
  return (
    <div className="flex flex-col gap-3">
      <RefreshNewsButton />
      {categories.map((group) => (
        <CategorySection key={group.section} group={group} />
      ))}
    </div>
  );
}
