import { GoogleGenAI } from "@google/genai";

export type RoleTrack = "strategy" | "ops" | "gm" | "digital";

export interface ParsedJD {
  companyName: string;
  roleTitle: string;
  track: RoleTrack;
  mustHaveKeywords: string[];
  niceToHaveKeywords: string[];
  coreThemes: string[];
  summary: string;
}

export async function parseJD(jdText: string): Promise<ParsedJD> {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

  const prompt = `You are a consulting resume expert. Analyze this job description and extract structured data for resume tailoring.

JD:
${jdText}

Return ONLY valid JSON with this exact structure:
{
  "companyName": "company name or empty string",
  "roleTitle": "role title",
  "track": one of "strategy" | "ops" | "gm" | "digital",
  "mustHaveKeywords": ["keyword1", "keyword2", ...],
  "niceToHaveKeywords": ["keyword1", ...],
  "coreThemes": ["theme1", "theme2", ...],
  "summary": "2-sentence summary of what this role needs"
}

Track selection:
- "strategy": strategy consulting, M&A, corporate strategy, market entry, growth
- "ops": operations consulting, supply chain, process improvement, transformation delivery
- "digital": digital transformation, technology strategy, AI/data, ERP
- "gm": general management, P&L ownership, business leadership, founder's office`;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const text = result.text?.trim() ?? "{}";
  return JSON.parse(text) as ParsedJD;
}
