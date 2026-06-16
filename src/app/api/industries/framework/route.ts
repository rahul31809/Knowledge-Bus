import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { FrameworkInsight } from "@/lib/types";

export const maxDuration = 60;

interface FrameworkRequestBody {
  industryName?: string;
  subsectorName?: string;
  frameworkName?: string;
  context?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asRating(value: unknown): "High" | "Medium" | "Low" {
  return value === "High" || value === "Medium" || value === "Low" ? value : "Medium";
}

function normalizeFrameworkInsight(raw: unknown, frameworkName: string): FrameworkInsight {
  const obj = isRecord(raw) ? raw : {};

  const summary = asString(obj.summary);
  const factors = asArray(obj.factors)
    .map((f) => ({
      name: asString(f.name),
      rating: asRating(f.rating),
      description: asString(f.description),
    }))
    .filter((f) => f.name);

  return { framework: frameworkName, summary, factors };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as FrameworkRequestBody;
  const industryName = body.industryName?.trim();
  const subsectorName = body.subsectorName?.trim();
  const frameworkName = body.frameworkName?.trim();
  const context = body.context?.trim() ?? "";

  if (!industryName || !subsectorName || !frameworkName) {
    return NextResponse.json({ error: "Missing industryName, subsectorName or frameworkName" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_AI_API_KEY is not configured" }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an MBB-level management consultant building a visual framework breakdown for an MBA student preparing for strategy consulting case interviews (Big 4 / Accenture Strategy, India-focused recruiting).

Apply the "${frameworkName}" framework to the "${subsectorName}" sub-sector of "${industryName}" in India.

Context on why this framework is relevant here: ${context || "Not provided — use your own judgment."}

Return a single JSON object with exactly this structure:

{
  "summary": "2-3 sentence 'so what' takeaway on how this framework plays out in this sub-sector — markdown allowed (e.g. **bold** for the key point)",
  "factors": [
    {"name": "Factor or force name", "rating": "High" | "Medium" | "Low", "description": "1-2 sentence explanation specific to this sub-sector, plain text, no markdown"}
  ]
}

Requirements:
- "factors" needs 4-6 items, structured to fit "${frameworkName}" specifically:
  - Porter's Five Forces -> the 5 forces (Threat of New Entrants, Bargaining Power of Suppliers, Bargaining Power of Buyers, Threat of Substitutes, Competitive Rivalry), each rated by intensity.
  - Value Chain Analysis -> the relevant value chain stages, each rated by value capture.
  - Profitability Framework -> key revenue/cost levers, each rated by impact.
  - Case themes (e.g. Market Entry, Turnaround Strategy, Growth Strategy) -> the key decision levers or success criteria for that theme, each rated by priority/favorability in this sub-sector.
  - For any other framework, pick the natural sub-structure a consultant would use.
- "rating" must be exactly "High", "Medium", or "Low" — it reflects intensity/impact/priority, not inherently good or bad.
- "description" must be plain text (no markdown, no asterisks), specific to "${subsectorName}" in India, not generic.
- "summary" is the only field that may use markdown formatting.
- Output ONLY the JSON object, no commentary, no markdown fences.`;

  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });

  const text = result.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return NextResponse.json({ error: "Gemini did not return a JSON object for the framework insight" }, { status: 502 });
  }

  const parsed = JSON.parse(match[0]) as Record<string, unknown>;
  const insight = normalizeFrameworkInsight(parsed, frameworkName);

  return NextResponse.json(insight);
}
