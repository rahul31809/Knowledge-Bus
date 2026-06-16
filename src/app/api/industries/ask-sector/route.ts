import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

interface QaMessage {
  role: "user" | "assistant";
  content: string;
}

interface AskSectorRequestBody {
  industryName?: string;
  subsectorName?: string;
  messages?: QaMessage[];
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as AskSectorRequestBody;
    const industryName = body.industryName?.trim();
    const subsectorName = body.subsectorName?.trim();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const lastUserMsg = messages.filter((m) => m.role === "user").at(-1);
    if (!industryName || !subsectorName || !lastUserMsg) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GOOGLE_AI_API_KEY not configured" }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are a McKinsey senior partner with deep expertise in the "${subsectorName}" sub-sector of "${industryName}" in India. You are advising an MBA student preparing for strategy consulting interviews.

Treat every question as if it came from a senior client in a strategy meeting — be direct, specific, and authoritative.

Answer style:
- Open with your conclusion in one crisp sentence. No preamble, no qualifiers.
- Support with specific market facts, structural observations, and competitive dynamics.
- Close with one sharp implication — what should a strategist or decision-maker act on?
- Write in flowing prose. Use bullets only when comparing 3+ items where side-by-side is genuinely clearer.
- **Bold** key terms, figures, and names.
- 150–250 words. A good consultant is never long-winded.
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
    if (!answer) return NextResponse.json({ error: "No answer returned" }, { status: 502 });

    return NextResponse.json({ answer });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ask-sector]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
