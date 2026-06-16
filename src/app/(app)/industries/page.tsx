import { Breadcrumbs } from "@/components/breadcrumbs";
import { INDUSTRY_TAXONOMY } from "@/lib/industry-taxonomy";

export default function IndustriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Industries" }]} />

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Industry Primers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a sub-sector from the sidebar for a consultant-style primer — market size &amp; growth,
          future outlook, value chain, policy &amp; regulation, technology trends, AI integration, major
          players, key metrics, and a consulting lens.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {INDUSTRY_TAXONOMY.map((industry) => (
          <div key={industry.slug} className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">{industry.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{industry.subsectors.length} sub-sectors</p>
          </div>
        ))}
      </div>
    </div>
  );
}
