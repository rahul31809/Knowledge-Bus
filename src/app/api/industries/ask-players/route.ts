import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

interface QaMessage {
  role: "user" | "assistant";
  content: string;
}

interface AskPlayersRequestBody {
  industryName?: string;
  subsectorName?: string;
  players?: string[];
  messages?: QaMessage[];
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
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const lastUserMsg = messages.filter((m) => m.role === "user").at(-1);

    if (!industryName || !subsectorName || players.length < 2 || !lastUserMsg) {
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

    const systemInstruction = `You are a McKinsey senior partner. An MBA student is asking you about specific companies in the "${subsectorName}" sub-sector of "${industryName}" in India.

Companies in scope — answer about ONLY these:
${playerList}

Answer the way you would verbally brief a client — direct, confident, conclusion-first.
- Open with your conclusion in one crisp sentence. No preamble.
- Support with company-specific facts: name each company explicitly, cite concrete metrics or strategic observations.
- Close with one sharp implication for decision-making.
- Write in flowing prose. Use bullet points only where a side-by-side comparison genuinely needs it.
- Use **bold** for company names and the single most important metric or insight per paragraph.
- Keep each response to 150–250 words. A good consultant is never long-winded.
- For follow-up questions, maintain continuity with your previous answers in this conversation.
- If the question cannot be answered specifically about these companies, say so plainly and state what data would be needed.`;

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents,
      config: { systemInstruction },
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
