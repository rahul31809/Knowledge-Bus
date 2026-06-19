import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ArticleGrid } from "@/components/news/article-grid";
import { sectionFromSlug } from "@/lib/news/section-slugs";
import { fetchBookmarkedNewsArticles, fetchNewsArticlesBySection, fetchSavedNewsArticles } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { NewsArticle } from "@/lib/types";

export default async function NewsViewPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  const supabase = await createClient();

  let title: string;
  let articles: NewsArticle[];
  let emptyMessage: string;
  let showCategoryTag = false;

  if (view === "bookmarked") {
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
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "News", href: "/news" }, { label: title }]} />
      <h1 className="font-serif text-2xl font-semibold text-foreground">{title}</h1>
      <ArticleGrid articles={articles} emptyMessage={emptyMessage} showCategoryTag={showCategoryTag} />
    </div>
  );
}
