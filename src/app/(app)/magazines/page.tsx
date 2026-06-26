import { MagazineLibrary } from "@/components/magazine-library";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { fetchMagazineArticlesByCategory } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export default async function MagazinesPage() {
  const supabase = await createClient();
  const categories = await fetchMagazineArticlesByCategory(supabase);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Articles" }]} />

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Magazines</h1>
        <p className="text-sm text-muted-foreground">
          Articles pulled from the tables of contents of your magazine issues in Drive, grouped by topic.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No articles yet. Run the magazine scan to populate this page.
        </div>
      ) : (
        <MagazineLibrary categories={categories} />
      )}
    </div>
  );
}
