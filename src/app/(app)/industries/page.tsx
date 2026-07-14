import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { INDUSTRY_TAXONOMY } from "@/lib/industry-taxonomy";
import { PrepStatusDot } from "@/components/industry-primer/prep-status-toggle";
import { fetchAllPrepStatuses } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { PrepStatus } from "@/lib/types";

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

export default async function IndustriesPage() {
  const supabase = await createClient();
  const allPrep = await fetchAllPrepStatuses(supabase);
  const prepMap = new Map(allPrep.map((p) => [`${p.industry_slug}/${p.subsector_slug}`, p.status as PrepStatus]));

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
          const statuses = industry.subsectors.map((sub) =>
            prepMap.get(`${industry.slug}/${sub.slug}`) ?? "not_started"
          );
          const readyCount = statuses.filter((s) => s === "case_ready").length;
          const familiarCount = statuses.filter((s) => s === "familiar").length;
          return (
            <div key={industry.slug} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <span className="text-xl leading-none">{icon}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">{industry.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {industry.subsectors.length} sub-sectors
                    {readyCount > 0 && (
                      <span className="ml-2 text-emerald-600 font-medium">{readyCount} case-ready</span>
                    )}
                    {familiarCount > 0 && (
                      <span className="ml-1.5 text-amber-500 font-medium">{familiarCount} familiar</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-3">
                {industry.subsectors.map((sub) => {
                  const status = prepMap.get(`${industry.slug}/${sub.slug}`) ?? "not_started";
                  return (
                    <Link
                      key={sub.slug}
                      href={`/industries/${industry.slug}/${sub.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/20"
                    >
                      <PrepStatusDot status={status} />
                      {sub.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
