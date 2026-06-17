"use client";

import { useState, useTransition } from "react";
import { ChevronRightIcon, ExternalLinkIcon } from "lucide-react";
import { setArticleReadStatus } from "@/app/(app)/magazines/actions";
import { cn } from "@/lib/utils";
import type { MagazineArticle, MagazineCategoryGroup } from "@/lib/types";

function ArticleRow({ article }: { article: MagazineArticle }) {
  const [isRead, setIsRead] = useState(article.isRead);
  const [pending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setIsRead(checked);
    startTransition(async () => {
      try {
        await setArticleReadStatus(article.id, checked);
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
        className="size-4 shrink-0"
        aria-label={`Mark "${article.title}" as read`}
      />
      <a
        href={article.webViewLink}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-1 items-center gap-2 truncate"
      >
        <div className="flex flex-col truncate">
          <span className={cn("truncate text-sm group-hover:underline", isRead ? "text-muted-foreground line-through" : "text-foreground")}>
            {article.title}
          </span>
          <span className="truncate text-xs text-muted-foreground">{article.issueLabel}</span>
        </div>
        <ExternalLinkIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
      </a>
    </div>
  );
}

function CategorySection({ group }: { group: MagazineCategoryGroup }) {
  const readCount = group.articles.filter((a) => a.isRead).length;

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
    </details>
  );
}

export function MagazineLibrary({ categories }: { categories: MagazineCategoryGroup[] }) {
  return (
    <div className="flex flex-col gap-3">
      {categories.map((group) => (
        <CategorySection key={group.section} group={group} />
      ))}
    </div>
  );
}
