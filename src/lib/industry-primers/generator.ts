import { GoogleGenAI } from "@google/genai";
import { sanitizeBodyHtml } from "@/lib/sanitize";
import type { IndustryPrimerContent } from "@/lib/types";

const PRIMER_KEYS: (keyof IndustryPrimerContent)[] = [
  "overview",
  "market_size_growth",
  "future_outlook",
  "value_chain",
  "policy_regulatory",
  "technology_trends",
  "ai_digital_integration",
  "major_players",
  "key_metrics",
  "consulting_lens",
];

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

Produce a single JSON object with exactly these 10 keys. Each value is a short HTML snippet using only <p>, <ul>, <li>, <strong> (no headings, no markdown, no code fences):

- "overview": 2-3 sentences on what this sub-sector covers, where it sits in the economy, and why it matters.
- "market_size_growth": current India market size (₹/$ figures) and historical growth rate (CAGR), as bullet points.
- "future_outlook": projected growth over the next 3-5 years and the key demand drivers, as bullet points.
- "value_chain": the key stages/segments of the value chain and where economic value/margin is concentrated.
- "policy_regulatory": the key Indian policies, regulators, and recent reforms relevant to this sub-sector.
- "technology_trends": the latest technology trends reshaping this sub-sector.
- "ai_digital_integration": how AI and digital tools are being adopted across this sub-sector's value chain.
- "major_players": 5-8 major companies (Indian and global players active in India) as a bullet list, each with a one-line positioning note.
- "key_metrics": 5-6 KPIs/metrics a consultant should know for this sub-sector, with typical benchmark ranges.
- "consulting_lens": which strategy frameworks apply (e.g. Porter's Five Forces, value chain analysis, BCG matrix) and 2-3 likely case-interview themes for this sub-sector.

Be specific and quantitative wherever possible. Output ONLY the JSON object, no commentary, no markdown fences.`;

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

  const content = {} as IndustryPrimerContent;
  for (const key of PRIMER_KEYS) {
    const value = parsed[key];
    content[key] = sanitizeBodyHtml(typeof value === "string" ? value : "");
  }
  return content;
}
