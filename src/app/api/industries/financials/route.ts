import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

interface FinancialsRequestBody {
  players?: string[];
  industryName?: string;
  subsectorName?: string;
}

export interface FinancialYear {
  year: string;
  revenue?: number | null;
  grossProfit?: number | null;
  operatingIncome?: number | null;
  ebitda?: number | null;
  netIncome?: number | null;
  eps?: number | null;
  totalAssets?: number | null;
  totalDebt?: number | null;
  totalEquity?: number | null;
  operatingCashFlow?: number | null;
  capex?: number | null;
}

export interface FinancialRatios {
  roe?: number | null;
  roa?: number | null;
  operatingMargin?: number | null;
  profitMargin?: number | null;
  revenueGrowth?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  pe?: number | null;
  forwardPE?: number | null;
  pb?: number | null;
  evEbitda?: number | null;
  marketCap?: number | null;
  dividendYield?: number | null;
  beta?: number | null;
}

export interface FinancialCompanyData {
  name: string;
  ticker: string;
  currency: string;
  dataNote?: string;
  years: FinancialYear[];
  ratios: FinancialRatios;
  error?: never;
}

export interface FinancialCompanyError {
  name: string;
  ticker?: string;
  error: string;
}

export type FinancialCompanyResult = FinancialCompanyData | FinancialCompanyError;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as FinancialsRequestBody;
    const players = Array.isArray(body.players) ? body.players.filter(Boolean) : [];
    const subsectorName = body.subsectorName?.trim() ?? "";
    const industryName = body.industryName?.trim() ?? "";

    if (players.length < 1) {
      return NextResponse.json({ error: "Select at least 1 company" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GOOGLE_AI_API_KEY not configured" }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });

    const playerList = players.map((p, i) => `${i + 1}. ${p}`).join("\n");

    const prompt = `You are a financial research analyst with deep knowledge of company annual reports, stock exchange filings, and investor presentations.

Today's date is June 2026. Use this to determine the most recent completed fiscal years.
- Indian companies (March 31 year-end): FY2026 ended March 31 2026, FY2025 ended March 31 2025, FY2024 ended March 31 2024. Include FY2026 if data is available, otherwise FY2025 as the most recent.
- Calendar year companies: FY2025 (Jan–Dec 2025) is the most recent completed year.
- Always include the 3 most recently COMPLETED fiscal years, most recent first.

Provide financial data for the following companies operating in the "${subsectorName}" sub-sector of "${industryName}":
${playerList}

Return a JSON array. Each element must follow this exact schema:

[
  {
    "name": "exact company name as provided above",
    "ticker": "EXCHANGE:TICKER (e.g. NSE:INDIGOCA, BSE:500180, NYSE:GOOGL)",
    "currency": "INR_CR for Indian companies (all monetary values in ₹ Crores), USD_M for US/global companies (values in $ Millions)",
    "dataNote": "e.g. 'FY ends March 31' or 'consolidated financials' — keep to one short phrase",
    "years": [
      {
        "year": "FY2025",
        "revenue": <number or null>,
        "grossProfit": <number or null>,
        "operatingIncome": <number or null>,
        "ebitda": <number or null>,
        "netIncome": <number or null>,
        "eps": <EPS in ₹ or $ per share, number or null>,
        "totalAssets": <number or null>,
        "totalDebt": <number or null>,
        "totalEquity": <number or null>,
        "operatingCashFlow": <number or null>,
        "capex": <capex as positive number or null>
      }
    ],
    "ratios": {
      "roe": <decimal, e.g. 0.15 for 15%, or null>,
      "roa": <decimal or null>,
      "operatingMargin": <decimal or null>,
      "profitMargin": <decimal or null>,
      "revenueGrowth": <latest year YoY decimal or null>,
      "debtToEquity": <ratio number or null>,
      "currentRatio": <number or null>,
      "pe": <trailing P/E or null>,
      "forwardPE": <forward P/E or null>,
      "pb": <price-to-book or null>,
      "evEbitda": <EV/EBITDA or null>,
      "marketCap": <in same crores/millions as other values, or null>,
      "dividendYield": <decimal or null>,
      "beta": <number or null>
    }
  }
]

Rules:
- Include the 3 most recent completed fiscal years, most recent first (see date context above — FY2025 or FY2026 should be the latest for most companies)
- Use real data from annual reports or stock exchange filings — do not fabricate numbers
- For Indian companies: all monetary values in ₹ Crores
- For US/global companies: all monetary values in $ Millions
- Ratios must be decimals (0.18 for 18%, NOT 18)
- capex should be a positive number representing cash spent
- Return null for any figure you cannot provide with reasonable confidence
- If a company is not publicly listed or data is unavailable, set all year values and ratios to null and add a note in dataNote
- Return ONLY the JSON array — no markdown fences, no commentary`;

    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    const text = result.text?.trim() ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return NextResponse.json({ error: "Could not parse financial data from Gemini" }, { status: 502 });
    }

    const companies = JSON.parse(match[0]) as FinancialCompanyResult[];
    return NextResponse.json({ companies });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[financials]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
