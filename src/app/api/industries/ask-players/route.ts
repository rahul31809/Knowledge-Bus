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

    const prompt = `You are an MBB-level management consultant helping an MBA student prepare for strategy consulting interviews (Big 4 / Accenture Strategy, India-focused).

The student is analysing the "${subsectorName}" sub-sector of "${industryName}" in India, and has selected these specific companies for deep-dive:

${playerList}

Answer the following question about ONLY these companies. Do not bring in other players.

Question: "${question}"

Structure your answer in exactly this format — use markdown:

**So What**
[1-2 sentences that directly answer the question at a strategic level — the kind of insight that opens a McKinsey slide. Lead with the key differentiator or decision-relevant conclusion.]

**Key Findings**
[3-5 bullet points. Each bullet must name the specific company and cite a concrete fact, metric, or strategic observation. Be specific — avoid generic statements that could apply to any company in the sector.]

**Consulting Angle**
[1-2 sentences on how this insight would appear in a case interview: which hypothesis it validates, what recommendation it informs, or what follow-up question it raises for the interviewer.]

Rules:
- Answer ONLY about the companies listed above.
- Use **bold** for company names and key terms within bullets.
- If the question genuinely cannot be answered specifically about these companies, say so clearly and explain what information is needed.
- Do not pad with background industry context unless it directly differentiates the companies.`;

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
