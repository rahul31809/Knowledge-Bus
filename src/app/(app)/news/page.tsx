import { NewsLibrary } from "@/components/news-library";
import { fetchNewsArticlesByCategory } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export default async function NewsPage() {
  const supabase = await createClient();
  const categories = await fetchNewsArticlesByCategory(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Current News</h1>
        <p className="text-sm text-muted-foreground">
          Daily articles from your market, business and energy newsletters, grouped by topic.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No articles yet. Click &quot;Refresh&quot; to run the first scan.
        </div>
      ) : (
        <NewsLibrary categories={categories} />
      )}
    </div>
  );
}
