import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUBSECTOR_KPI_HINTS } from "@/lib/subsector-kpi-hints";
import type { PrimerComparisonResult } from "@/lib/types";

export const maxDuration = 60;

interface CompareCandidate {
  name: string;
  origin?: string;
  positioning?: string;
}

interface CompareRequestBody {
  industryName?: string;
  subsectorName?: string;
  subsectorSlug?: string;
  players?: CompareCandidate[];
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

function normalizeComparison(raw: unknown, playerNames: string[]): PrimerComparisonResult {
  const obj = isRecord(raw) ? raw : {};

  const synthesis = asString(obj.synthesis);

  const parameters = Array.isArray(obj.parameters)
    ? obj.parameters.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    : [];

  const validNames = new Set(playerNames.map((n) => n.toLowerCase()));
  const rows = asArray(obj.rows)
    .map((r) => ({
      player: asString(r.player),
      values: Array.isArray(r.values) ? r.values.map((v) => asString(v, "—")) : [],
    }))
    .filter((r) => r.player && validNames.has(r.player.toLowerCase()))
    .map((r) => ({
      player: r.player,
      values: Array.from({ length: parameters.length }, (_, i) => r.values[i] ?? "—"),
    }));

  return { synthesis, parameters, rows };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CompareRequestBody;
  const industryName = body.industryName?.trim();
  const subsectorName = body.subsectorName?.trim();
  const subsectorSlug = body.subsectorSlug?.trim();
  const players = Array.isArray(body.players) ? body.players : [];
  const kpiHints = subsectorSlug ? SUBSECTOR_KPI_HINTS[subsectorSlug] : undefined;

  if (!industryName || !subsectorName || players.length < 2 || players.length > 3) {
    return NextResponse.json({ error: "Select 2-3 players to compare" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_AI_API_KEY is not configured" }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });

  const playerList = players
    .map((p, i) => {
      const origin = p.origin ? ` (${p.origin})` : "";
      const positioning = p.positioning ? ` — ${p.positioning}` : "";
      return `${i + 1}. ${p.name}${origin}${positioning}`;
    })
    .join("\n");

  const prompt = `You are an MBB-level management consultant briefing an MBA student preparing for strategy consulting interviews (Big 4 / Accenture Strategy, India-focused recruiting).

Compare the following companies operating in the "${subsectorName}" sub-sector of "${industryName}" in India, on parameters relevant to a consulting case discussion:

${playerList}

Some of these companies may not have an origin/positioning hint above — use your own knowledge of that company to place it accurately.

Return a single JSON object with exactly this structure:

{
  "synthesis": "2-4 sentence 'so what' takeaway for a case interview, comparing these players at a strategic level — markdown allowed (e.g. **bold** for the key differentiator)",
  "parameters": ["Parameter 1", "Parameter 2", "..."],
  "rows": [
    {"player": "${players[0].name}", "values": ["value for parameter 1", "value for parameter 2", "..."]}
  ]
}

Requirements:
- "parameters" needs 7-9 items. Draw from MBB competitive-benchmarking dimensions appropriate to this sub-sector.${kpiHints ? ` Prioritise these sector-specific KPIs for "${subsectorName}": ${kpiHints.join(", ")}. Supplement with strategic dimensions (Market Positioning, Growth Strategy, Risk Profile) as needed to reach 7-9 total.` : " Pick the most relevant strategic and operational dimensions for these specific companies."}
- "rows" needs exactly one entry per company listed above, in the same order, with "player" matching the company name exactly.
- Each "values" array must have the same length and order as "parameters". Values must be plain text (no markdown, no asterisks) — be specific and quantitative where possible.
- "synthesis" is the only field that may use markdown formatting.
- Output ONLY the JSON object, no commentary, no markdown fences.`;

  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });

  const text = result.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return NextResponse.json({ error: "Gemini did not return a JSON object for the comparison" }, { status: 502 });
  }

  const parsed = JSON.parse(match[0]) as Record<string, unknown>;
  const comparison = normalizeComparison(
    parsed,
    players.map((p) => p.name)
  );

  return NextResponse.json(comparison);
}
