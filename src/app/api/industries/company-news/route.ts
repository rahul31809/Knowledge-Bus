import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export interface NewsItem {
  title: string;
  summary: string;
  source: string;
  date: string;
  url: string;
}

export interface CompanyNewsResult {
  company: string;
  items: NewsItem[];
  error?: string;
}

interface CompanyNewsRequestBody {
  companies?: string[];
  industryName?: string;
  subsectorName?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as CompanyNewsRequestBody;
    const companies = Array.isArray(body.companies) ? body.companies.filter(Boolean) : [];
    const subsectorName = body.subsectorName?.trim() ?? "";

    if (companies.length < 1) {
      return NextResponse.json({ error: "Select at least one company" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GOOGLE_AI_API_KEY not configured" }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });

    const results = await Promise.all(
      companies.map(async (company): Promise<CompanyNewsResult> => {
        try {
          const prompt = `Find the 4-5 most important news articles about ${company}${subsectorName ? ` in the ${subsectorName} sector` : ""} published in the past 90 days.

Return ONLY a valid JSON array — no markdown fences, no commentary, no extra text:
[
  {
    "title": "Exact or near-exact article headline",
    "summary": "2 sentences: what happened and why it matters for investors or industry observers",
    "source": "Publication name (e.g. Economic Times, Mint, Reuters, Business Standard)",
    "date": "e.g. Jun 10, 2025",
    "url": "Direct URL to the article"
  }
]

Prioritise: earnings, deals/acquisitions, regulatory actions, leadership changes, capacity expansions, market share shifts. Skip press releases and promotional content.`;

          const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              tools: [{ googleSearch: {} }],
            },
          });

          const text = result.text?.trim() ?? "";
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (!jsonMatch) throw new Error("No JSON array found in response");
          const items = JSON.parse(jsonMatch[0]) as NewsItem[];
          return { company, items: items.slice(0, 5) };
        } catch (err) {
          return {
            company,
            items: [],
            error: err instanceof Error ? err.message : "Failed to fetch news",
          };
        }
      })
    );

    return NextResponse.json({ companies: results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[company-news]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
