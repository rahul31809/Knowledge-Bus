import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { INDUSTRY_TAXONOMY } from "@/lib/industry-taxonomy";

const INDUSTRY_ICONS: Record<string, string> = {
  "energy-power": "⚡",
  "financial-services": "🏦",
  "technology-internet": "💻",
  "healthcare-pharma": "🏥",
  "consumer-retail": "🛒",
  "automotive-industrial-manufacturing": "🚗",
  "infrastructure-real-estate-construction": "🏗️",
  "metals-mining-chemicals": "⛏️",
  "agriculture-allied": "🌾",
  "transportation-logistics": "🚚",
  "media-entertainment-gaming": "🎬",
  "education-skilling": "📚",
  "hospitality-travel": "✈️",
  "public-sector-government-defense": "🏛️",
};

export default function IndustriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Industries" }]} />

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Industry Primers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consultant-style primers across <strong className="text-foreground">14 industries</strong> and{" "}
          <strong className="text-foreground">62 sub-sectors</strong> — market size, value chain, key players,
          and a consulting lens.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {INDUSTRY_TAXONOMY.map((industry) => {
          const icon = INDUSTRY_ICONS[industry.slug] ?? "📋";
          return (
            <div key={industry.slug} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <span className="text-xl leading-none">{icon}</span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{industry.name}</h2>
                  <p className="text-xs text-muted-foreground">{industry.subsectors.length} sub-sectors</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-3">
                {industry.subsectors.map((sub) => (
                  <Link
                    key={sub.slug}
                    href={`/industries/${industry.slug}/${sub.slug}`}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/20"
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
