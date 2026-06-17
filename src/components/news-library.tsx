"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  BarChart3Icon,
  BookmarkIcon,
  BriefcaseIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  LandmarkIcon,
  Loader2Icon,
  NewspaperIcon,
  RefreshCwIcon,
  SparklesIcon,
  TrendingUpIcon,
  ZapIcon,
} from "lucide-react";
import { setNewsArticleReadStatus, setNewsArticleSavedStatus } from "@/app/(app)/news/actions";
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
  return `${Math.round(diffHours / 24)}d ago`;
}

function compareByPublishedDesc(a: NewsArticle, b: NewsArticle): number {
  if (!a.publishedAt && !b.publishedAt) return 0;
  if (!a.publishedAt) return 1;
  if (!b.publishedAt) return -1;
  return b.publishedAt.localeCompare(a.publishedAt);
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Markets & Investing": TrendingUpIcon,
  "Business & Corporate Strategy": BriefcaseIcon,
  "Economy & Policy": LandmarkIcon,
  "Energy & Infrastructure": ZapIcon,
  "Valuation & Corporate Finance": BarChart3Icon,
};

function CategoryIcon({ section }: { section: string }) {
  const Icon = CATEGORY_ICONS[section] ?? NewspaperIcon;
  return <Icon className="size-4 shrink-0 text-muted-foreground" />;
}

function ArticleRow({ article }: { article: NewsArticle }) {
  const [isRead, setIsRead] = useState(article.isRead);
  const [isSaved, setIsSaved] = useState(article.isSaved);
  const [readPending, startReadTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();

  function handleReadToggle(checked: boolean) {
    setIsRead(checked);
    startReadTransition(async () => {
      try {
        await setNewsArticleReadStatus(article.id, checked);
      } catch {
        setIsRead(!checked);
      }
    });
  }

  function handleSaveToggle() {
    const next = !isSaved;
    setIsSaved(next);
    startSaveTransition(async () => {
      try {
        await setNewsArticleSavedStatus(article.id, next);
      } catch {
        setIsSaved(!next);
      }
    });
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 border-l-2 py-2 pl-3 pr-2 transition-colors hover:bg-muted/40",
        isRead ? "border-l-transparent" : "border-l-primary"
      )}
    >
      <input
        type="checkbox"
        checked={isRead}
        disabled={readPending}
        onChange={(e) => handleReadToggle(e.target.checked)}
        className="mt-0.5 size-3.5 shrink-0 accent-primary"
        aria-label={`Mark "${article.title}" as read`}
      />
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex min-w-0 flex-1 flex-col gap-0.5"
        onClick={() => { if (!isRead) handleReadToggle(true); }}
      >
        <span
          className={cn(
            "text-sm leading-snug group-hover:underline",
            isRead ? "text-muted-foreground line-through decoration-muted-foreground/40" : "font-medium text-foreground"
          )}
        >
          {article.title}
        </span>
        <span className="text-xs text-muted-foreground">
          {article.source}
          {article.publishedAt ? ` · ${formatRelativeTime(article.publishedAt)}` : ""}
        </span>
      </a>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={handleSaveToggle}
          disabled={savePending}
          className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          aria-label={isSaved ? "Unsave" : "Save"}
        >
          <BookmarkIcon className={cn("size-3.5", isSaved ? "fill-current text-amber-500" : "")} />
        </button>
        <ExternalLinkIcon className="size-3 text-muted-foreground/40" />
      </div>
    </div>
  );
}

function SavedSection({ articles }: { articles: NewsArticle[] }) {
  return (
    <details open className="group/saved rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open/saved:rotate-90" />
        <BookmarkIcon className="size-4 shrink-0 text-amber-500" />
        <span className="text-sm font-semibold text-foreground">Saved</span>
        <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          {articles.length}
        </span>
      </summary>
      <div className="border-t border-border">
        {articles.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            No saved articles yet — click the bookmark icon on any article to save it here.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border/50">
            {articles.map((article) => (
              <ArticleRow key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function CategorySection({ group }: { group: NewsCategoryGroup }) {
  const readCount = group.articles.filter((a) => a.isRead).length;
  const total = group.articles.length;
  const pct = total > 0 ? Math.round((readCount / total) * 100) : 0;
  const unread = total - readCount;

  const [summary, setSummary] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSummarize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (summary) { setSummaryOpen((v) => !v); return; }
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
      setSummaryOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="group/category rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open/category:rotate-90" />
        <CategoryIcon section={group.section} />
        <span className="text-sm font-semibold text-foreground">{group.section}</span>
        {unread > 0 ? (
          <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
            {unread} unread
          </span>
        ) : (
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            all read
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handleSummarize}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {loading ? <Loader2Icon className="size-3 animate-spin" /> : <SparklesIcon className="size-3" />}
            AI Brief
          </button>
          <span className="text-xs text-muted-foreground">{readCount}/{total}</span>
        </div>
      </summary>

      {/* Read progress bar */}
      <div className="h-0.5 w-full bg-border">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* AI summary panel */}
      {(summary && summaryOpen) || error ? (
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : summary ? (
            <Markdown>{summary}</Markdown>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col divide-y divide-border/50">
        {group.articles.map((article) => (
          <ArticleRow key={article.id} article={article} />
        ))}
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
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
    >
      {loading ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
      Refresh
    </button>
  );
}

export function NewsLibrary({ categories }: { categories: NewsCategoryGroup[] }) {
  const allArticles = categories.flatMap((g) => g.articles);
  const totalUnread = allArticles.filter((a) => !a.isRead).length;
  const savedArticles = allArticles.filter((a) => a.isSaved).sort(compareByPublishedDesc);

  return (
    <div className="flex flex-col gap-4">
      {/* Page sub-header: unread count + refresh */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalUnread > 0 ? (
            <><span className="font-semibold text-foreground">{totalUnread}</span> unread articles</>
          ) : (
            "All caught up"
          )}
        </p>
        <RefreshNewsButton />
      </div>

      <SavedSection articles={savedArticles} />

      {categories.map((group) => (
        <CategorySection key={group.section} group={group} />
      ))}
    </div>
  );
}
