import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CompanyAnalysisView } from "@/components/industry-primer/company-analysis-view";
import { ResetCompanyAnalysisButton } from "@/components/industry-primer/reset-company-analysis-button";
import { generateCompanyAnalysis } from "@/lib/company-analysis/generator";
import { findSubsector } from "@/lib/industry-taxonomy";
import { fetchCompanyAnalysis, saveCompanyAnalysis } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export default async function CompanyAnalysisPage({
  params,
}: {
  params: Promise<{ industry: string; subsector: string; company: string }>;
}) {
  const { industry: industrySlug, subsector: subsectorSlug, company: companyParam } = await params;
  const match = findSubsector(industrySlug, subsectorSlug);
  if (!match) notFound();

  const { industry, subsector } = match;
  const companyName = decodeURIComponent(companyParam);
  const supabase = await createClient();

  let analysis = await fetchCompanyAnalysis(supabase, industrySlug, subsectorSlug, companyName);
  let generationError: string | null = null;

  if (!analysis) {
    try {
      const content = await generateCompanyAnalysis(companyName, industry.name, subsector.name);
      analysis = await saveCompanyAnalysis(supabase, industrySlug, subsectorSlug, companyName, content);
    } catch (err) {
      generationError = err instanceof Error ? err.message : "Failed to generate company analysis";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Industries", href: "/industries" },
          { label: industry.name, href: `/industries/${industrySlug}` },
          { label: subsector.name, href: `/industries/${industrySlug}/${subsectorSlug}` },
          { label: companyName },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{companyName}</h1>
          <p className="text-sm text-muted-foreground">
            {subsector.name} — {industry.name}
          </p>
        </div>
        {analysis ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <ResetCompanyAnalysisButton
              industrySlug={industrySlug}
              subsectorSlug={subsectorSlug}
              companyName={companyName}
            />
            <p className="text-xs text-muted-foreground">
              Generated {new Date(analysis.generated_at).toLocaleDateString()}
            </p>
          </div>
        ) : null}
      </div>

      {generationError ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          Couldn&apos;t generate this analysis ({generationError}). Refresh the page to try again.
        </div>
      ) : null}

      {analysis ? <CompanyAnalysisView analysis={analysis} /> : null}

      {analysis ? (
        <p className="text-xs text-muted-foreground">
          AI-generated — verify key figures before use in presentations or interviews.
        </p>
      ) : null}
    </div>
  );
}
