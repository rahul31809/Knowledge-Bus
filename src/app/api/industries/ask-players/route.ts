import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

interface AskPlayersRequestBody {
  industryName?: string;
  subsectorName?: string;
  players?: string[];
  question?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as AskPlayersRequestBody;
    const industryName = body.industryName?.trim();
    const subsectorName = body.subsectorName?.trim();
    const players = Array.isArray(body.players) ? body.players.filter(Boolean) : [];
    const question = body.question?.trim();

    if (!industryName || !subsectorName || players.length < 2 || !question) {
      return NextResponse.json(
        { error: "Provide a question and select at least 2 companies" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_AI_API_KEY is not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const playerList = players.map((p, i) => `${i + 1}. ${p}`).join("\n");

    const prompt = `You are a McKinsey senior partner. An MBA student has asked you a question about specific companies in the "${subsectorName}" sub-sector of "${industryName}" in India. Answer the way you would verbally brief a client — direct, confident, and conclusion-first.

Companies in scope (answer about ONLY these):
${playerList}

Question: "${question}"

How to answer:
- Open with your conclusion in one crisp sentence — no preamble, no "great question."
- Back it up with 2–4 company-specific observations. Name each company explicitly. Cite actual metrics, strategic facts, or structural differences — never generic sector commentary.
- Close with one sharp implication: what this means for a decision, a hypothesis, or what the client should do next.
- Write in flowing prose. Use bullet points only where a list genuinely adds clarity (e.g., comparing 3+ data points side by side). Do not use section headers or template labels.
- Use **bold** for company names and the single most important metric or insight per paragraph.
- Keep it to 150–250 words. A good consultant is never long-winded.
- If the question cannot be answered specifically about these companies with available knowledge, say so plainly and state what data would be needed.`;

    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    const answer = result.text?.trim() ?? "";
    if (!answer) {
      return NextResponse.json({ error: "No answer returned from Gemini" }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ask-players]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
