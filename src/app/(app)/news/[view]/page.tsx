import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ArticleGrid } from "@/components/news/article-grid";
import { NewsSearchBox } from "@/components/news/news-search-box";
import { sectionFromSlug } from "@/lib/news/section-slugs";
import {
  fetchBookmarkedNewsArticles,
  fetchNewsArticlesBySection,
  fetchSavedNewsArticles,
  searchNewsArticles,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { NewsArticle } from "@/lib/types";

export default async function NewsViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ view: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { view } = await params;
  const { q } = await searchParams;
  const supabase = await createClient();

  let title: string;
  let articles: NewsArticle[];
  let emptyMessage: string;
  let showCategoryTag = false;
  let showSearchBox = false;

  if (view === "search") {
    const query = q?.trim() ?? "";
    title = query ? `Search results for "${query}"` : "Search";
    articles = query ? await searchNewsArticles(supabase, query) : [];
    emptyMessage = query ? `No articles found for "${query}".` : "Enter a search term above.";
    showCategoryTag = true;
    showSearchBox = true;
  } else if (view === "bookmarked") {
    title = "Bookmarked";
    articles = await fetchBookmarkedNewsArticles(supabase);
    emptyMessage = "No bookmarked articles yet — click the bookmark icon on any article to flag it for later.";
    showCategoryTag = true;
  } else if (view === "saved") {
    title = "Saved Articles";
    articles = await fetchSavedNewsArticles(supabase);
    emptyMessage = "No saved articles yet — click the star icon on any article to keep it for reference.";
    showCategoryTag = true;
  } else {
    const section = sectionFromSlug(view);
    if (!section) notFound();
    title = section;
    articles = await fetchNewsArticlesBySection(supabase, section);
    emptyMessage = "No articles in this topic yet.";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "News", href: "/news" }, { label: title }]} />
          <h1 className="font-serif text-2xl font-semibold text-foreground">{title}</h1>
        </div>
        <NewsSearchBox defaultValue={showSearchBox ? (q ?? "") : ""} />
      </div>
      <ArticleGrid articles={articles} emptyMessage={emptyMessage} showCategoryTag={showCategoryTag} />
    </div>
  );
}
