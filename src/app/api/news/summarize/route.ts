import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NEWS_SECTIONS } from "@/lib/types";

export const maxDuration = 30;

interface SummarizeRequestBody {
  section?: string;
}

const ARTICLE_LIMIT = 8;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SummarizeRequestBody;
  const section = body.section;

  if (!section || !(NEWS_SECTIONS as readonly string[]).includes(section)) {
    return NextResponse.json({ error: "Invalid or missing section" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("news_articles")
    .select("title, summary")
    .eq("category", section)
    .order("published_at", { ascending: false })
    .limit(ARTICLE_LIMIT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const articles = data ?? [];
  if (articles.length === 0) {
    return NextResponse.json({ error: "No articles in this section yet" }, { status: 404 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_AI_API_KEY is not configured" }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });

  const articleList = articles
    .map((a, i) => `${i + 1}. ${a.title}${a.summary ? ` — ${a.summary}` : ""}`)
    .join("\n");

  const prompt = `You are briefing an MBA student preparing for strategy consulting interviews (Big 4 / Accenture Strategy, India-focused recruiting) on recent news in the "${section}" category.

Here are the recent article headlines and summaries:
${articleList}

Write a "so what" takeaway: 2-3 bullet points covering the key stories and why they matter for someone building consulting case-readiness and business fluency. Markdown allowed (e.g. **bold** for key terms). Output ONLY the bullet points, no preamble.`;

  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });

  const text = (result.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Gemini did not return a summary" }, { status: 502 });
  }

  return NextResponse.json({ summary: text });
}
