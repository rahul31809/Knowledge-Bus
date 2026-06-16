import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { QaSource } from "@/lib/types";

export const maxDuration = 60;

interface AskRequestBody {
  industryName?: string;
  subsectorName?: string;
  question?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as AskRequestBody;
  const industryName = body.industryName?.trim();
  const subsectorName = body.subsectorName?.trim();
  const question = body.question?.trim();

  if (!industryName || !subsectorName || !question) {
    return NextResponse.json({ error: "Missing industryName, subsectorName, or question" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_AI_API_KEY is not configured" }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an MBB-level management consultant briefing an MBA student preparing for strategy consulting interviews (Big 4 / Accenture Strategy, India-focused recruiting).

The student is reading a primer on the "${subsectorName}" sub-sector of "${industryName}" in India and has a follow-up question. Answer concisely (3-6 sentences or short bullet points), with a consulting/case-interview lens where relevant. Use current information where helpful.

Question: ${question}`;

  let text = "";
  const sources: QaSource[] = [];

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    text = result.text ?? "";

    const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const seen = new Set<string>();
    for (const chunk of chunks) {
      const uri = chunk.web?.uri;
      if (!uri || seen.has(uri)) continue;
      seen.add(uri);
      sources.push({ uri, title: chunk.web?.title ?? uri });
    }
  } catch {
    // Google Search grounding may not be supported for this model/request —
    // retry without it so the question still gets answered.
    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });
    text = result.text ?? "";
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Gemini did not return an answer" }, { status: 502 });
  }

  return NextResponse.json({ answer: text.trim(), sources });
}
