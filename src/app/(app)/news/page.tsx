import { ArticleGrid } from "@/components/news/article-grid";
import { ExploreMenu } from "@/components/news/explore-menu";
import { GmailConnect } from "@/components/news/gmail-connect";
import { NewsSearchBox } from "@/components/news/news-search-box";
import { RefreshNewsButton } from "@/components/news/refresh-news-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { fetchGmailConnectionStatus, fetchLatestNewsArticles } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export default async function NewsPage() {
  const supabase = await createClient();
  const [latest, gmailStatus] = await Promise.all([
    fetchLatestNewsArticles(supabase, 13),
    fetchGmailConnectionStatus(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Current News" }]} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Current News</h1>
          <p className="text-sm text-muted-foreground">
            Daily articles from your market, business and energy newsletters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewsSearchBox />
          <RefreshNewsButton />
          <GmailConnect status={gmailStatus} />
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
