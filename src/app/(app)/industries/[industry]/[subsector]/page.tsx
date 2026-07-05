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
import { RecentUpdates } from "@/components/industry-primer/recent-updates";
import { GlossaryGrid } from "@/components/industry-primer/glossary-grid";
import { RevenueCostBreakdown } from "@/components/industry-primer/revenue-cost-breakdown";
import { PorterFiveForces } from "@/components/industry-primer/porter-five-forces";
import { PestleGrid } from "@/components/industry-primer/pestle-grid";
import { RiskMatrixGrid } from "@/components/industry-primer/risk-matrix";
import { MarketSegmentsGrid } from "@/components/industry-primer/market-segments-grid";
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
      if (err instanceof Error) {
        generationError = err.message;
      } else if (typeof err === "object" && err !== null && "message" in err) {
        generationError = String((err as Record<string, unknown>).message);
      } else {
        generationError = String(err);
      }
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

          {/* ── 1. OVERVIEW ─────────────────────────────────────────────────── */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              <SourceLink query={`Overview ${searchContext}`}>Overview</SourceLink>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{primer.overview.summary}</p>
            <div className="mt-3">
              <StatRow stats={primer.overview.key_stats} />
            </div>
          </section>

          {/* ── 2. MARKET SIZE & FUTURE OUTLOOK ─────────────────────────────── */}
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
                <SourceLink query={`Future Outlook ${searchContext}`}>Future Outlook</SourceLink>
              </h2>
              <div className="mt-3">
                <StatRow
                  stats={[
                    { label: "Projected Size", value: primer.future_outlook.projection_label },
                    { label: "Projected CAGR", value: primer.future_outlook.projected_cagr_label },
                  ]}
                />
              </div>
              <div className="mt-4">
                <BarChart data={primer.future_outlook.comparison} unit={primer.future_outlook.trend_unit} />
              </div>
            </section>
          </div>

          {/* ── 3. GROWTH DRIVERS & CHALLENGES ──────────────────────────────── */}
          {(primer.future_outlook.drivers.length > 0 ||
            (primer.future_outlook.challenges && primer.future_outlook.challenges.length > 0)) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {primer.future_outlook.drivers.length > 0 && (
                <section className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <h2 className="mb-3 text-sm font-semibold text-foreground">
                    <SourceLink query={`Growth Drivers ${searchContext}`}>Growth Drivers</SourceLink>
                  </h2>
                  <TaggedCardGrid
                    items={primer.future_outlook.drivers.map((d) => ({ title: d.title, description: d.description }))}
                    searchContext={searchContext}
                  />
                </section>
              )}
              {primer.future_outlook.challenges && primer.future_outlook.challenges.length > 0 && (
                <section className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
                  <h2 className="mb-3 text-sm font-semibold text-foreground">Challenges &amp; Headwinds</h2>
                  <TaggedCardGrid
                    items={primer.future_outlook.challenges.map((c) => ({ title: c.title, description: c.description }))}
                    searchContext={searchContext}
                  />
                </section>
              )}
            </div>
          )}

          {/* ── 4. MARKET SEGMENTS (absorbs Business Models) ─────────────────── */}
          {primer.market_segments && primer.market_segments.segments.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                <SourceLink query={`${subsector.name} market segments India`}>Market Segments</SourceLink>
              </h2>
              <MarketSegmentsGrid segments={primer.market_segments.segments} />
            </section>
          )}

          {/* ── 5. VALUE CHAIN ───────────────────────────────────────────────── */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              <SourceLink query={`Value Chain ${searchContext}`}>Value Chain</SourceLink>
            </h2>
            <div className="mt-3">
              <ValueChainDiagram stages={primer.value_chain.stages} searchContext={searchContext} />
            </div>
          </section>

          {/* ── 6. REVENUE & COST BREAKDOWN ─────────────────────────────────── */}
          {primer.revenue_cost_breakdown &&
            (primer.revenue_cost_breakdown.revenue.length > 0 || primer.revenue_cost_breakdown.costs.length > 0) && (
              <section className="rounded-lg border border-border bg-card p-4">
                <h2 className="mb-4 text-sm font-semibold text-foreground">
                  <SourceLink query={`${subsector.name} revenue model cost structure India`}>
                    Revenue &amp; Cost Breakdown
                  </SourceLink>
                </h2>
                <RevenueCostBreakdown data={primer.revenue_cost_breakdown} />
              </section>
            )}

          {/* ── 7. MAJOR PLAYERS ────────────────────────────────────────────── */}
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

          {/* ── 8. RECENT UPDATES ───────────────────────────────────────────── */}
          {primer.recent_updates && primer.recent_updates.updates.length > 0 && (
            <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                <SourceLink query={`${subsector.name} India latest news 2025`}>Recent Updates</SourceLink>
              </h2>
              <RecentUpdates updates={primer.recent_updates.updates} />
            </section>
          )}

          {/* ── 9. PORTER'S FIVE FORCES ─────────────────────────────────────── */}
          {primer.porter_five_forces && primer.porter_five_forces.forces.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                <SourceLink query={`Porter Five Forces ${searchContext}`}>Porter&apos;s Five Forces</SourceLink>
              </h2>
              <PorterFiveForces forces={primer.porter_five_forces.forces} />
            </section>
          )}

          {/* ── 10. POLICY & REGULATORY ──────────────────────────────────────── */}
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

          {/* ── 11. PESTLE ───────────────────────────────────────────────────── */}
          {primer.pestle && primer.pestle.items.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                <SourceLink query={`PESTLE analysis ${searchContext}`}>PESTLE Analysis</SourceLink>
              </h2>
              <PestleGrid items={primer.pestle.items} />
            </section>
          )}

          {/* ── 12. TECHNOLOGY & DIGITAL (merged) ───────────────────────────── */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              <SourceLink query={`Technology Digital Trends ${searchContext}`}>Technology &amp; Digital</SourceLink>
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
            {primer.ai_digital_integration.use_cases.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">AI &amp; Digital Use Cases</p>
                <TaggedCardGrid
                  items={primer.ai_digital_integration.use_cases.map((useCase) => ({
                    title: useCase.title,
                    description: useCase.description,
                    tag: `${useCase.impact} impact`,
                    tagVariant: impactVariant(useCase.impact),
                  }))}
                  searchContext={searchContext}
                />
              </>
            )}
          </section>

          {/* ── 13. RISK MATRIX ──────────────────────────────────────────────── */}
          {primer.risk_matrix &&
            (primer.risk_matrix.financial.length > 0 || primer.risk_matrix.operational.length > 0) && (
              <section className="rounded-lg border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Risk Matrix</h2>
                <RiskMatrixGrid matrix={primer.risk_matrix} />
              </section>
            )}

          {/* ── 14. KEY METRICS ──────────────────────────────────────────────── */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              <SourceLink query={`Key Metrics ${searchContext}`}>Key Metrics for Consultants</SourceLink>
            </h2>
            <div className="mt-3">
              <MetricTiles metrics={primer.key_metrics.metrics} searchContext={searchContext} />
            </div>
          </section>

          {/* ── 15. CONSULTING LENS (highlighted — most interview-critical) ───── */}
          <section className="rounded-lg border border-violet-500/40 bg-violet-500/5 p-4">
            <h2 className="text-sm font-semibold text-foreground">
              <SourceLink query={`Consulting Lens ${searchContext}`}>Consulting Lens</SourceLink>
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Frameworks &amp; case themes for interview prep</p>
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

          {/* ── 16. Q&A PRACTICE ─────────────────────────────────────────────── */}
          <SectorQaSection
            industryName={industry.name}
            subsectorName={subsector.name}
          />

          {/* ── 17. GLOSSARY (reference — bottom) ───────────────────────────── */}
          {primer.glossary && primer.glossary.terms.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-1 text-sm font-semibold text-foreground">Industry Terminology</h2>
              <p className="mb-3 text-xs text-muted-foreground">Reference — key terms and formulas for this sub-sector</p>
              <GlossaryGrid terms={primer.glossary.terms} />
            </section>
          )}

          <p className="text-xs text-muted-foreground">
            AI-generated — verify key figures before use in presentations.
          </p>
        </div>
      ) : null}
    </div>
  );
}
