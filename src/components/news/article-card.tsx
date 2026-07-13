"use client";

import { useState, useTransition } from "react";
import { BookmarkIcon, CheckIcon, ExternalLinkIcon, StarIcon } from "lucide-react";
import {
  setNewsArticleBookmarkedStatus,
  setNewsArticleReadStatus,
  setNewsArticleSavedStatus,
} from "@/app/(app)/news/actions";
import { cn } from "@/lib/utils";
import type { NewsArticle } from "@/lib/types";

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

interface ArticleCardProps {
  article: NewsArticle;
  size?: "hero" | "default" | "list";
  selected: boolean;
  onSelectToggle: (id: string) => void;
  showCategoryTag?: boolean;
}

export function ArticleCard({ article, size = "default", selected, onSelectToggle, showCategoryTag = false }: ArticleCardProps) {
  const [isRead, setIsRead] = useState(article.isRead);
  const [isSaved, setIsSaved] = useState(article.isSaved);
  const [isBookmarked, setIsBookmarked] = useState(article.isBookmarked);
  const [, startReadTransition] = useTransition();
  const [, startSaveTransition] = useTransition();
  const [, startBookmarkTransition] = useTransition();

  function markRead() {
    if (isRead) return;
    setIsRead(true);
    startReadTransition(async () => {
      try {
        await setNewsArticleReadStatus(article.id, true);
      } catch {
        setIsRead(false);
      }
    });
  }

  function toggleSaved() {
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

  function toggleBookmarked() {
    const next = !isBookmarked;
    setIsBookmarked(next);
    startBookmarkTransition(async () => {
      try {
        await setNewsArticleBookmarkedStatus(article.id, next);
      } catch {
        setIsBookmarked(!next);
      }
    });
  }

  const isHero = size === "hero";
  const isList = size === "list";

  if (isList) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 py-3",
          selected && "bg-primary/5"
        )}
      >
        <label className="mt-0.5 flex shrink-0 items-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelectToggle(article.id)}
            className="size-3.5 accent-primary"
            aria-label={`Select "${article.title}" for AI summary`}
          />
        </label>

        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={markRead}
          className="group min-w-0 flex-1"
        >
          <span
            className={cn(
              "block font-serif text-base font-semibold leading-snug group-hover:underline",
              isRead ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {article.title}
          </span>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {showCategoryTag ? (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {article.category}
              </span>
            ) : null}
            <span>{article.source}</span>
            {article.publishedAt ? <span>· {formatRelativeTime(article.publishedAt)}</span> : null}
            {isRead ? (
              <span className="inline-flex items-center gap-0.5">
                <CheckIcon className="size-3" /> Read
              </span>
            ) : null}
          </p>
        </a>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={toggleBookmarked}
            className="text-muted-foreground/50 hover:text-foreground"
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            <BookmarkIcon className={cn("size-3.5", isBookmarked && "fill-current text-amber-500")} />
          </button>
          <button
            type="button"
            onClick={toggleSaved}
            className="text-muted-foreground/50 hover:text-foreground"
            aria-label={isSaved ? "Unsave" : "Save"}
          >
            <StarIcon className={cn("size-3.5", isSaved && "fill-current text-sky-500")} />
          </button>
          <a href={article.link} target="_blank" rel="noopener noreferrer" onClick={markRead}>
            <ExternalLinkIcon className="size-3 text-muted-foreground/30 hover:text-muted-foreground" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors",
        selected ? "border-primary/50 ring-1 ring-primary/30" : "border-border"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelectToggle(article.id)}
            className="size-3.5 accent-primary"
            aria-label={`Select "${article.title}" for AI summary`}
          />
          Select
        </label>
        {showCategoryTag ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {article.category}
          </span>
        ) : null}
      </div>

      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={markRead}
        className="group flex flex-col gap-1.5"
      >
        <span
          className={cn(
            "font-serif leading-snug group-hover:underline",
            isHero ? "text-2xl font-semibold sm:text-3xl" : "text-lg font-semibold",
            isRead ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {article.title}
        </span>
        {article.summary ? (
          <p className={cn("text-sm text-muted-foreground", isHero ? "line-clamp-3" : "line-clamp-2")}>
            {article.summary}
          </p>
        ) : null}
      </a>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{article.source}</span>
          {article.publishedAt ? <span>· {formatRelativeTime(article.publishedAt)}</span> : null}
          {isRead ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
              <CheckIcon className="size-3" /> Read
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleBookmarked}
            className="text-muted-foreground hover:text-foreground"
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
            title="Bookmark"
          >
            <BookmarkIcon className={cn("size-4", isBookmarked && "fill-current text-amber-500")} />
          </button>
          <button
            type="button"
            onClick={toggleSaved}
            className="text-muted-foreground hover:text-foreground"
            aria-label={isSaved ? "Unsave" : "Save"}
            title="Save"
          >
            <StarIcon className={cn("size-4", isSaved && "fill-current text-sky-500")} />
          </button>
          <a href={article.link} target="_blank" rel="noopener noreferrer" onClick={markRead}>
            <ExternalLinkIcon className="size-3.5 text-muted-foreground/50 hover:text-muted-foreground" />
          </a>
        </div>
      </div>
    </div>
  );
}
