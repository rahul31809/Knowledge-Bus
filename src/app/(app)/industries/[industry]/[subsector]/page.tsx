import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { generateIndustryPrimer } from "@/lib/industry-primers/generator";
import { findSubsector } from "@/lib/industry-taxonomy";
import { fetchIndustryPrimer, saveIndustryPrimer } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { IndustryPrimerContent } from "@/lib/types";

export const maxDuration = 60;

const PRIMER_SECTIONS: { key: keyof IndustryPrimerContent; title: string }[] = [
  { key: "overview", title: "Overview" },
  { key: "market_size_growth", title: "Market Size & Growth" },
  { key: "future_outlook", title: "Future Outlook & Growth Drivers" },
  { key: "value_chain", title: "Value Chain" },
  { key: "policy_regulatory", title: "Policy & Regulatory Landscape" },
  { key: "technology_trends", title: "Technology Trends" },
  { key: "ai_digital_integration", title: "AI & Digital Integration" },
  { key: "major_players", title: "Major Players" },
  { key: "key_metrics", title: "Key Metrics for Consultants" },
  { key: "consulting_lens", title: "Consulting Lens" },
];

export default async function IndustryPrimerPage({
  params,
}: {
  params: Promise<{ industry: string; subsector: string }>;
}) {
  const { industry: industrySlug, subsector: subsectorSlug } = await params;
  const match = findSubsector(industrySlug, subsectorSlug);
  if (!match) notFound();

  const { industry, subsector } = match;
  const supabase = await createClient();

  let primer = await fetchIndustryPrimer(supabase, industrySlug, subsectorSlug);
  let generationError: string | null = null;

  if (!primer) {
    try {
      const content = await generateIndustryPrimer(industry.name, subsector.name);
      primer = await saveIndustryPrimer(
        supabase,
        industrySlug,
        subsectorSlug,
        industry.name,
        subsector.name,
        content
      );
    } catch (err) {
      generationError = err instanceof Error ? err.message : "Failed to generate primer";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Industries", href: "/industries" },
          { label: industry.name },
          { label: subsector.name },
        ]}
      />

      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">{subsector.name}</h1>
        <p className="text-sm text-neutral-500">{industry.name}</p>
      </div>

      {generationError ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-500">
          Couldn&apos;t generate this primer ({generationError}). Refresh the page to try again.
        </div>
      ) : null}

      {primer ? (
        <div className="flex flex-col gap-4">
          {PRIMER_SECTIONS.map((section) => (
            <div key={section.key} className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-neutral-900">{section.title}</h2>
              <div
                className="prose prose-sm mt-2 max-w-none text-neutral-600"
                dangerouslySetInnerHTML={{ __html: primer[section.key] || "<p>—</p>" }}
              />
            </div>
          ))}
          <p className="text-xs text-neutral-400">
            Generated {new Date(primer.generated_at).toLocaleDateString()} — AI-generated, verify key figures.
          </p>
        </div>
      ) : null}
    </div>
  );
}
