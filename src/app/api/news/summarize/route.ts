import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

interface SummarizeRequestBody {
  articleId?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SummarizeRequestBody;
  const articleId = body.articleId?.trim();

  if (!articleId) {
    return NextResponse.json({ error: "Missing articleId" }, { status: 400 });
  }

  const { data: article, error } = await supabase
    .from("news_articles")
    .select("title, summary, source")
    .eq("id", articleId)
    .single();

  if (error || !article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_AI_API_KEY is not configured" }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are briefing an MBA student preparing for strategy consulting interviews (Big 4 / Accenture Strategy, India-focused recruiting) on this news article:

Title: ${article.title}
Source: ${article.source}
Snippet: ${article.summary ?? "(no snippet available)"}

Write a tight analyst summary (4-5 sentences):
- What exactly happened — the core fact
- The business or market implication — why it matters
- One sentence on how this could surface in a case interview or business discussion

Use **bold** for key terms and numbers. Output only the summary — no headers, no preamble.`;

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
