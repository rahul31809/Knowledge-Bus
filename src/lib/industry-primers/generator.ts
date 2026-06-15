import { GoogleGenAI } from "@google/genai";
import type {
  IndustryPrimerContent,
  ImpactLevel,
  Maturity,
  PrimerAiDigitalIntegration,
  PrimerConsultingLens,
  PrimerFutureOutlook,
  PrimerKeyMetrics,
  PrimerMajorPlayers,
  PrimerMarketSizeGrowth,
  PrimerOverview,
  PrimerPolicyRegulatory,
  PrimerTechnologyTrends,
  PrimerValueChain,
  ValueCapture,
} from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function normalizeOverview(raw: unknown): PrimerOverview {
  const obj = isRecord(raw) ? raw : {};
  return {
    summary: asString(obj.summary),
    key_stats: asArray(obj.key_stats)
      .map((s) => ({ label: asString(s.label), value: asString(s.value) }))
      .filter((s) => s.label && s.value),
  };
}

function normalizeMarketSizeGrowth(raw: unknown): PrimerMarketSizeGrowth {
  const obj = isRecord(raw) ? raw : {};
  return {
    current_size_label: asString(obj.current_size_label),
    cagr_label: asString(obj.cagr_label),
    trend_unit: asString(obj.trend_unit),
    historical_trend: asArray(obj.historical_trend)
      .map((p) => ({ label: asString(p.label), value: asNumber(p.value) }))
      .filter((p) => p.label),
    commentary: asString(obj.commentary),
  };
}

function normalizeFutureOutlook(raw: unknown): PrimerFutureOutlook {
  const obj = isRecord(raw) ? raw : {};
  return {
    projection_label: asString(obj.projection_label),
    projected_cagr_label: asString(obj.projected_cagr_label),
    trend_unit: asString(obj.trend_unit),
    comparison: asArray(obj.comparison)
      .map((p) => ({ label: asString(p.label), value: asNumber(p.value) }))
      .filter((p) => p.label),
    drivers: asArray(obj.drivers)
      .map((d) => ({ title: asString(d.title), description: asString(d.description) }))
      .filter((d) => d.title),
  };
}

function normalizeValueChain(raw: unknown): PrimerValueChain {
  const obj = isRecord(raw) ? raw : {};
  const captures: readonly ValueCapture[] = ["high", "medium", "low"];
  return {
    stages: asArray(obj.stages)
      .map((s) => ({
        name: asString(s.name),
        description: asString(s.description),
        value_capture: asEnum(s.value_capture, captures, "medium"),
      }))
      .filter((s) => s.name),
  };
}

function normalizePolicyRegulatory(raw: unknown): PrimerPolicyRegulatory {
  const obj = isRecord(raw) ? raw : {};
  return {
    items: asArray(obj.items)
      .map((i) => ({
        title: asString(i.title),
        authority: asString(i.authority),
        year: asString(i.year),
        description: asString(i.description),
      }))
      .filter((i) => i.title),
  };
}

function normalizeTechnologyTrends(raw: unknown): PrimerTechnologyTrends {
  const obj = isRecord(raw) ? raw : {};
  const maturities: readonly Maturity[] = ["emerging", "scaling", "mainstream"];
  return {
    trends: asArray(obj.trends)
      .map((t) => ({
        title: asString(t.title),
        description: asString(t.description),
        maturity: asEnum(t.maturity, maturities, "scaling"),
      }))
      .filter((t) => t.title),
  };
}

function normalizeAiDigitalIntegration(raw: unknown): PrimerAiDigitalIntegration {
  const obj = isRecord(raw) ? raw : {};
  const impacts: readonly ImpactLevel[] = ["high", "medium", "low"];
  return {
    use_cases: asArray(obj.use_cases)
      .map((u) => ({
        title: asString(u.title),
        description: asString(u.description),
        impact: asEnum(u.impact, impacts, "medium"),
      }))
      .filter((u) => u.title),
  };
}

function normalizeMajorPlayers(raw: unknown): PrimerMajorPlayers {
  const obj = isRecord(raw) ? raw : {};
  return {
    players: asArray(obj.players)
      .map((p) => ({
        name: asString(p.name),
        origin: asEnum(p.origin, ["Indian", "Global"] as const, "Indian"),
        positioning: asString(p.positioning),
      }))
      .filter((p) => p.name),
  };
}

function normalizeKeyMetrics(raw: unknown): PrimerKeyMetrics {
  const obj = isRecord(raw) ? raw : {};
  return {
    metrics: asArray(obj.metrics)
      .map((m) => ({
        name: asString(m.name),
        benchmark: asString(m.benchmark),
        description: asString(m.description),
      }))
      .filter((m) => m.name),
  };
}

function normalizeConsultingLens(raw: unknown): PrimerConsultingLens {
  const obj = isRecord(raw) ? raw : {};
  return {
    frameworks: asArray(obj.frameworks)
      .map((f) => ({ name: asString(f.name), application: asString(f.application) }))
      .filter((f) => f.name),
    case_themes: asArray(obj.case_themes)
      .map((c) => ({ title: asString(c.title), description: asString(c.description) }))
      .filter((c) => c.title),
  };
}

export async function generateIndustryPrimer(
  industryName: string,
  subsectorName: string,
): Promise<IndustryPrimerContent> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an MBB-level management consultant briefing an MBA student preparing for strategy consulting interviews (Big 4 / Accenture Strategy, India-focused recruiting).

Write an industry primer for the following India sub-sector:

Industry: ${industryName}
Sub-sector: ${subsectorName}
Geographic focus: India, with global context only where it materially affects the Indian market.

Return a single JSON object with exactly this structure. The strings and numbers below are FORMAT EXAMPLES ONLY — replace every value with real, specific content for this sub-sector.

{
  "overview": {
    "summary": "2-3 sentence overview of what this sub-sector covers, where it sits in the economy, and why it matters",
    "key_stats": [
      {"label": "Market Size (FY25)", "value": "₹85,000 Cr"},
      {"label": "5-Yr CAGR", "value": "12%"},
      {"label": "Major Players", "value": "15+"}
    ]
  },
  "market_size_growth": {
    "current_size_label": "₹85,000 Cr (FY25)",
    "cagr_label": "12% CAGR (FY20-25)",
    "trend_unit": "₹ '000 Cr",
    "historical_trend": [
      {"label": "FY21", "value": 50},
      {"label": "FY22", "value": 58},
      {"label": "FY23", "value": 67},
      {"label": "FY24", "value": 76},
      {"label": "FY25", "value": 85}
    ],
    "commentary": "1-2 sentences on what is driving this trend"
  },
  "future_outlook": {
    "projection_label": "Projected to reach ₹1,60,000 Cr by FY30",
    "projected_cagr_label": "~14% CAGR (FY25-30E)",
    "trend_unit": "₹ '000 Cr",
    "comparison": [
      {"label": "Current (FY25)", "value": 85},
      {"label": "Projected (FY30)", "value": 160}
    ],
    "drivers": [
      {"title": "Driver name", "description": "1 sentence explanation"}
    ]
  },
  "value_chain": {
    "stages": [
      {"name": "Stage name", "description": "1 sentence on what happens at this stage", "value_capture": "high"}
    ]
  },
  "policy_regulatory": {
    "items": [
      {"title": "Policy or regulation name", "authority": "Issuing body, e.g. MNRE", "year": "2023", "description": "1 sentence on what it does and why it matters"}
    ]
  },
  "technology_trends": {
    "trends": [
      {"title": "Trend name", "description": "1 sentence on what it is and its impact", "maturity": "emerging"}
    ]
  },
  "ai_digital_integration": {
    "use_cases": [
      {"title": "Use case name", "description": "1 sentence on how AI/digital tools are applied here", "impact": "high"}
    ]
  },
  "major_players": {
    "players": [
      {"name": "Company name", "origin": "Indian", "positioning": "1 sentence on their position in this sub-sector"}
    ]
  },
  "key_metrics": {
    "metrics": [
      {"name": "Metric name", "benchmark": "Typical value or range", "description": "1 sentence on why a consultant should track this"}
    ]
  },
  "consulting_lens": {
    "frameworks": [
      {"name": "Framework name, e.g. Porter's Five Forces", "application": "1 sentence on how it applies to this sub-sector"}
    ],
    "case_themes": [
      {"title": "Likely case theme", "description": "1 sentence on what the case would explore"}
    ]
  }
}

Requirements:
- "historical_trend" needs 4-6 points ending at the most recent year; "comparison" needs exactly 2 points (current vs projected).
- All numeric "value" fields must be plain numbers (no currency symbols, commas, or units) on a consistent scale matching "trend_unit".
- "value_chain.stages" needs 4-6 stages; "value_capture" must be "high", "medium", or "low".
- "policy_regulatory.items" needs 4-6 items.
- "technology_trends.trends" needs 4-6 items; "maturity" must be "emerging", "scaling", or "mainstream".
- "ai_digital_integration.use_cases" needs 4-6 items; "impact" must be "high", "medium", or "low".
- "major_players.players" needs 5-8 items; "origin" must be "Indian" or "Global".
- "key_metrics.metrics" needs 5-6 items.
- "consulting_lens.frameworks" needs 2-4 items; "consulting_lens.case_themes" needs 2-3 items.
- Be specific and quantitative. Output ONLY the JSON object, no commentary, no markdown fences.`;

  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });

  const text = result.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Gemini did not return a JSON object for the industry primer");
  }

  const parsed = JSON.parse(match[0]) as Record<string, unknown>;

  return {
    overview: normalizeOverview(parsed.overview),
    market_size_growth: normalizeMarketSizeGrowth(parsed.market_size_growth),
    future_outlook: normalizeFutureOutlook(parsed.future_outlook),
    value_chain: normalizeValueChain(parsed.value_chain),
    policy_regulatory: normalizePolicyRegulatory(parsed.policy_regulatory),
    technology_trends: normalizeTechnologyTrends(parsed.technology_trends),
    ai_digital_integration: normalizeAiDigitalIntegration(parsed.ai_digital_integration),
    major_players: normalizeMajorPlayers(parsed.major_players),
    key_metrics: normalizeKeyMetrics(parsed.key_metrics),
    consulting_lens: normalizeConsultingLens(parsed.consulting_lens),
  };
}
