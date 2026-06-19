import { ArticleGrid } from "@/components/news/article-grid";
import { ExploreMenu } from "@/components/news/explore-menu";
import { RefreshNewsButton } from "@/components/news/refresh-news-button";
import { fetchLatestNewsArticles } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export default async function NewsPage() {
  const supabase = await createClient();
  const latest = await fetchLatestNewsArticles(supabase, 13);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Current News</h1>
          <p className="text-sm text-muted-foreground">
            Daily articles from your market, business and energy newsletters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshNewsButton />
          <ExploreMenu />
        </div>
      </div>

      <ArticleGrid
        articles={latest}
        heroCount={1}
        showCategoryTag
        emptyMessage='No articles yet. Click "Refresh" to run the first scan.'
      />
    </div>
  );
}
