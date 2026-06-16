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

    const systemInstruction = `You are a McKinsey senior partner advising an MBA student on the "${subsectorName}" sub-sector of "${industryName}" in India.

The primary companies under discussion are:
${playerList}

Default behaviour: anchor your answers to these companies. When questions are about them, be specific — names, metrics, strategic facts.

Exception: if the student explicitly asks about other companies, a broader market, or anything outside this set, answer it fully and directly as a senior consultant would. Do not refuse or redirect — treat it as a natural extension of the strategic dialogue. You are not bound by any scope restriction when the student is clearly asking for something broader.

Answer style for all responses:
- Open with your conclusion in one crisp sentence. No preamble.
- Support with specific facts, metrics, or strategic observations.
- Close with one sharp implication for decision-making.
- Write in flowing prose. Use bullet points only where a side-by-side comparison genuinely needs it.
- Use **bold** for company names and key metrics.
- Keep responses to 150–250 words. A good consultant is never long-winded.
- Maintain continuity with prior answers in this conversation.`;

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
