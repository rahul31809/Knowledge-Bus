import { GoogleGenAI } from "@google/genai";
import type { CompanyAnalysisChunk, CompanyAnalysisContent, CompanyAnalysisSection } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeChunk(raw: unknown): CompanyAnalysisChunk {
  const obj = isRecord(raw) ? raw : {};
  const sections = Array.isArray(obj.sections) ? obj.sections : [];
  return {
    sections: sections
      .filter(isRecord)
      .map((s): CompanyAnalysisSection => ({ title: asString(s.title), markdown: asString(s.markdown) }))
      .filter((s) => s.title && s.markdown),
  };
}

interface ChunkSpec {
  key: keyof CompanyAnalysisContent;
  instructions: string;
}

const SHARED_PREAMBLE = (companyName: string, industryName: string, subsectorName: string) => `You are a world-class strategy consultant, industry analyst, MBA professor, and equity research analyst preparing a comprehensive company analysis for an MBA student (targeting strategy consulting placements at Big 4 / Accenture Strategy in India) studying ${companyName}, a player in the ${subsectorName} sub-sector of ${industryName} (India focus, with global context only where it materially matters).

Do not merely describe the company — explain how it creates, delivers, captures, and sustains value. Be structured, MECE, data-driven, and insight-oriented. Avoid generic, vague answers — be specific and quantitative wherever possible (real figures, real segment/competitor names); if you are not certain of an exact number, give a credible estimate and clearly flag it as approximate rather than inventing false precision.

Use markdown formatting (## and ### headers, bullet lists, **bold** for key terms, tables where useful for comparisons). Each section should be substantive — roughly 400-700 words, a placement-prep deep dive, not a summary.`;

const OUTPUT_FORMAT = (titles: string[]) => `Return ONLY a JSON object of this exact shape (no markdown fences, no commentary outside the JSON):
{
  "sections": [
${titles.map((t) => `    { "title": "${t}", "markdown": "..." }`).join(",\n")}
  ]
}`;

const CHUNKS: ChunkSpec[] = [
  {
    key: "chunk_foundation",
    instructions: `1. COMPANY OVERVIEW — Company history, founding story, evolution milestones, current business model, vision & mission, geographic presence, revenue composition, key business segments. Explicitly answer: "How does this company make money?"

2. INDUSTRY CONTEXT — Industry size, growth rate, value chain, key trends, regulatory environment, emerging disruptions. Apply Porter's Five Forces, Industry Lifecycle Analysis, and Value Chain Analysis. Explicitly answer: "Why does this industry exist?", "Where is value created?", "How is value shifting?"

3. BUSINESS MODEL ANALYSIS — Break down Value Creation (products, services, technology, brand), Value Delivery (distribution, sales channels, supply chain), Value Capture (revenue streams, pricing models, profit pools). Use the Business Model Canvas explicitly.

4. PRODUCT & CATEGORY ANALYSIS — For each major product/category: category size, growth rate, target customers, positioning, market share, competitive landscape. Explicitly answer: "Why do customers buy this product?", "What job is it performing?"`,
  },
  {
    key: "chunk_market",
    instructions: `5. CUSTOMER ANALYSIS — Core customer segments, customer personas, customer needs, customer pain points. Map the purchase journey: Awareness, Consideration, Purchase, Retention, Advocacy.

6. COMPETITIVE ANALYSIS — Identify direct competitors, indirect competitors, emerging challengers. For each, compare market share, pricing, distribution, innovation, brand strength, profitability. Use Strategic Group Mapping and Competitor Benchmarking.

7. SOURCES OF COMPETITIVE ADVANTAGE — Identify brand moat, technology moat, distribution moat, scale moat, data moat, network effects, switching costs. Explicitly answer: "Why is this company difficult to copy?"

8. INNOVATION ANALYSIS — Study innovations over the last 10 years, classified into: Product, Process, Business Model, Distribution, Marketing, Technology, Sustainability, Social, and Organizational Innovation. For each major innovation: problem addressed, innovation introduced, impact achieved, competitive advantage created. Identify recurring innovation patterns.`,
  },
  {
    key: "chunk_execution",
    instructions: `9. DIGITAL TRANSFORMATION ANALYSIS — Evaluate data capabilities, AI adoption, automation, digital channels, customer experience digitization. Determine a digital maturity level on a 1-5 scale and justify it.

10. FINANCIAL ANALYSIS — Revenue growth, profitability, margins, cash flow, ROCE, ROE, working capital. Identify growth drivers, margin drivers, financial risks. Explain the economics simply.

11. OPERATING MODEL ANALYSIS — Evaluate procurement, manufacturing, supply chain, logistics, inventory, sales operations. Identify operational strengths and operational bottlenecks.

12. ESG & SUSTAINABILITY — Environmental initiatives, social impact, governance quality. Assess whether ESG is strategic or merely compliance-driven, with reasoning.`,
  },
  {
    key: "chunk_outlook",
    instructions: `13. MAJOR CHALLENGES — Identify the top 5 current challenges (avoid generic answers; focus on structural challenges). For each: root cause, business impact, strategic implications, likelihood, severity.

14. FUTURE RISKS — Identify the top 5 risks likely to emerge over the next decade, spanning technology, consumer behavior, regulation, competition, and geopolitics.

15. FUTURE OPPORTUNITIES — Identify the top 5 growth opportunities. For each, estimate potential impact, ease of execution, and strategic fit.

16. MANAGEMENT & LEADERSHIP — Leadership philosophy, decision-making style, capital allocation, culture. Evaluate management quality with reasoning.`,
  },
  {
    key: "chunk_strategy_prep",
    instructions: `17. STRATEGIC RECOMMENDATIONS — Acting as a consultant, recommend short-term initiatives (1-2 years), medium-term initiatives (3-5 years), and long-term initiatives (5-10 years). Prioritize by impact, investment required, and difficulty.

18. MBA / INTERVIEW PREPARATION — Prepare 10 likely interview questions, 5 case interview questions, and 5 discussion topics about this company, each with a model answer.

19. EXECUTIVE SUMMARY — In under 500 words, summarize: Business Model, Competitive Advantage, Innovation Strategy, Biggest Challenge, Biggest Opportunity, Long-Term Outlook.

20. TEACH ME THE COMPANY — Assume the reader is an MBA student studying this company for placements. Teach: what makes this company unique, what lessons managers can learn from it, what mistakes competitors make, what strategic frameworks are most relevant. End the section with a direct answer to: "If I had only 5 minutes to explain this company in an interview, what would I say?"`,
  },
];

const TITLE_ACRONYMS = new Set(["MBA", "ESG", "AI"]);

function toTitleCase(raw: string): string {
  return raw
    .split(" ")
    .map((word) => (TITLE_ACRONYMS.has(word) || word.length <= 1 ? word : word.charAt(0) + word.slice(1).toLowerCase()))
    .join(" ");
}

function chunkTitles(instructions: string): string[] {
  return [...instructions.matchAll(/^(\d+)\.\s+([A-Z][A-Z &/.,'-]+?)\s+—/gm)].map(
    (m) => `${m[1]}. ${toTitleCase(m[2].trim())}`
  );
}

async function generateChunk(
  ai: GoogleGenAI,
  spec: ChunkSpec,
  companyName: string,
  industryName: string,
  subsectorName: string
): Promise<CompanyAnalysisChunk> {
  const titles = chunkTitles(spec.instructions);
  const prompt = `${SHARED_PREAMBLE(companyName, industryName, subsectorName)}

Write the following sections in full:

${spec.instructions}

${OUTPUT_FORMAT(titles)}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    const text = result.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { sections: [] };

    return normalizeChunk(JSON.parse(match[0]));
  } catch (err) {
    console.error(`[company-analysis] chunk ${spec.key}:`, err);
    return { sections: [] };
  }
}

export async function generateCompanyAnalysis(
  companyName: string,
  industryName: string,
  subsectorName: string
): Promise<CompanyAnalysisContent> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const [chunk_foundation, chunk_market, chunk_execution, chunk_outlook, chunk_strategy_prep] = await Promise.all(
    CHUNKS.map((spec) => generateChunk(ai, spec, companyName, industryName, subsectorName))
  );

  return { chunk_foundation, chunk_market, chunk_execution, chunk_outlook, chunk_strategy_prep };
}
