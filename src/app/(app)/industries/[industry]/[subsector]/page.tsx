import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BarChart } from "@/components/industry-primer/bar-chart";
import { FrameworkInsightGrid } from "@/components/industry-primer/framework-insight-grid";
import { MetricTiles } from "@/components/industry-primer/metric-tiles";
import { PlayerComparison } from "@/components/industry-primer/player-comparison";
import { SectorQaSection } from "@/components/industry-primer/sector-qa-section";
import { SourceLink } from "@/components/industry-primer/source-link";
import { StatRow } from "@/components/industry-primer/stat-row";
import { TaggedCardGrid, impactVariant, maturityVariant } from "@/components/industry-primer/tagged-card-grid";
import { ValueChainDiagram } from "@/components/industry-primer/value-chain-diagram";
import { ResetPrimerButton } from "@/components/industry-primer/reset-primer-button";
import { generateIndustryPrimer } from "@/lib/industry-primers/generator";
import { findSubsector } from "@/lib/industry-taxonomy";
import { fetchIndustryPrimer, saveIndustryPrimer } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

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

  const searchContext = `${subsector.name} India`;

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

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{subsector.name}</h1>
          <p className="text-sm text-muted-foreground">{industry.name}</p>
        </div>
        {primer ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <ResetPrimerButton industrySlug={industrySlug} subsectorSlug={subsectorSlug} />
            <p className="text-xs text-muted-foreground">
              Generated {new Date(primer.generated_at).toLocaleDateString()}
            </p>
          </div>
        ) : null}
      </div>

      {generationError ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          Couldn&apos;t generate this primer ({generationError}). Refresh the page to try again.
        </div>
      ) : null}

      {primer ? (
        <div className="flex flex-col gap-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              <SourceLink query={`Overview ${searchContext}`}>Overview</SourceLink>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{primer.overview.summary}</p>
            <div className="mt-3">
              <StatRow stats={primer.overview.key_stats} />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground">
                <SourceLink query={`Market Size & Growth ${searchContext}`}>Market Size &amp; Growth</SourceLink>
              </h2>
              <div className="mt-3">
                <StatRow
                  stats={[
                    { label: "Market Size", value: primer.market_size_growth.current_size_label },
                    { label: "Growth Rate", value: primer.market_size_growth.cagr_label },
                  ]}
                />
              </div>
              <div className="mt-4">
                <BarChart
                  data={primer.market_size_growth.historical_trend}
                  unit={primer.market_size_growth.trend_unit}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{primer.market_size_growth.commentary}</p>
            </section>

            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground">
                <SourceLink query={`Future Outlook & Growth Drivers ${searchContext}`}>
                  Future Outlook &amp; Growth Drivers
                </SourceLink>
              </h2>
              <div className="mt-3">
                <StatRow
                  stats={[
                    { label: "Outlook", value: primer.future_outlook.projection_label },
                    { label: "Projected Growth", value: primer.future_outlook.projected_cagr_label },
                  ]}
                />
              </div>
              <div className="mt-4">
                <BarChart data={primer.future_outlook.comparison} unit={primer.future_outlook.trend_unit} />
              </div>
              <div className="mt-3">
                <TaggedCardGrid
                  items={primer.future_outlook.drivers.map((driver) => ({
                    title: driver.title,
                    description: driver.description,
                  }))}
                  searchContext={searchContext}
                />
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              <SourceLink query={`Value Chain ${searchContext}`}>Value Chain</SourceLink>
            </h2>
            <div className="mt-3">
              <ValueChainDiagram stages={primer.value_chain.stages} searchContext={searchContext} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              <SourceLink query={`Policy & Regulatory Landscape ${searchContext}`}>
                Policy &amp; Regulatory Landscape
              </SourceLink>
            </h2>
            <div className="mt-3">
              <TaggedCardGrid
                items={primer.policy_regulatory.items.map((item) => ({
                  title: item.title,
                  description: `${item.authority} — ${item.description}`,
                  tag: item.year,
                  tagVariant: "neutral" as const,
                }))}
                searchContext={searchContext}
              />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground">
                <SourceLink query={`Technology Trends ${searchContext}`}>Technology Trends</SourceLink>
              </h2>
              <div className="mt-3">
                <TaggedCardGrid
                  items={primer.technology_trends.trends.map((trend) => ({
                    title: trend.title,
                    description: trend.description,
                    tag: trend.maturity,
                    tagVariant: maturityVariant(trend.maturity),
                  }))}
                  searchContext={searchContext}
                />
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground">
                <SourceLink query={`AI & Digital Integration ${searchContext}`}>AI &amp; Digital Integration</SourceLink>
              </h2>
              <div className="mt-3">
                <TaggedCardGrid
                  items={primer.ai_digital_integration.use_cases.map((useCase) => ({
                    title: useCase.title,
                    description: useCase.description,
                    tag: `${useCase.impact} impact`,
                    tagVariant: impactVariant(useCase.impact),
                  }))}
                  searchContext={searchContext}
                />
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              <SourceLink query={`Major Players ${searchContext}`}>Major Players</SourceLink>
            </h2>
            <div className="mt-3">
              <PlayerComparison
                players={primer.major_players.players}
                industryName={industry.name}
                subsectorName={subsector.name}
                industrySlug={industrySlug}
                subsectorSlug={subsectorSlug}
                searchContext={searchContext}
              />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              <SourceLink query={`Key Metrics ${searchContext}`}>Key Metrics for Consultants</SourceLink>
            </h2>
            <div className="mt-3">
              <MetricTiles metrics={primer.key_metrics.metrics} searchContext={searchContext} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              <SourceLink query={`Consulting Lens ${searchContext}`}>Consulting Lens</SourceLink>
            </h2>
            <div className="mt-3 flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Applicable Frameworks</p>
                <FrameworkInsightGrid
                  items={primer.consulting_lens.frameworks.map((framework) => ({
                    title: framework.name,
                    description: framework.application,
                  }))}
                  industryName={industry.name}
                  subsectorName={subsector.name}
                  searchContext={searchContext}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Likely Case Themes</p>
                <FrameworkInsightGrid
                  items={primer.consulting_lens.case_themes.map((theme) => ({
                    title: theme.title,
                    description: theme.description,
                  }))}
                  industryName={industry.name}
                  subsectorName={subsector.name}
                  searchContext={searchContext}
                />
              </div>
            </div>
          </section>

          <SectorQaSection
            industryName={industry.name}
            subsectorName={subsector.name}
          />

          <p className="text-xs text-muted-foreground">
            AI-generated — verify key figures before use in presentations.
          </p>
        </div>
      ) : null}
    </div>
  );
}
