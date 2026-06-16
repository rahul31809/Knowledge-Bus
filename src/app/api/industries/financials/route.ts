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
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  ebitda?: number;
  netIncome?: number;
  eps?: number;
  totalAssets?: number;
  totalDebt?: number;
  totalEquity?: number;
  operatingCashFlow?: number;
  capex?: number;
}

export interface FinancialRatios {
  roe?: number;
  roa?: number;
  operatingMargin?: number;
  profitMargin?: number;
  revenueGrowth?: number;
  debtToEquity?: number;
  currentRatio?: number;
  pe?: number;
  forwardPE?: number;
  pb?: number;
  evEbitda?: number;
  marketCap?: number;
  dividendYield?: number;
  beta?: number;
}

export interface FinancialCompanyData {
  name: string;
  ticker: string;
  currency: string;
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

async function resolveTicker(ai: GoogleGenAI, companyName: string, subsectorName: string): Promise<string | null> {
  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: `What is the Yahoo Finance ticker symbol for the company named "${companyName}" in the "${subsectorName}" sector?
For Indian companies listed on NSE append .NS; for BSE-only append .BO. For US/global companies use the primary exchange ticker (e.g. AAPL, GOOGL).
Reply with ONLY the ticker symbol — no explanation, no punctuation. If genuinely unknown, reply UNKNOWN.`,
  });
  const raw = result.text?.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "") ?? "";
  return raw && raw !== "UNKNOWN" && raw.length <= 16 ? raw : null;
}

function safeRaw(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "raw" in value) {
    const r = (value as { raw: unknown }).raw;
    return typeof r === "number" ? r : undefined;
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseYahooData(raw: any, name: string, ticker: string): FinancialCompanyData | null {
  const r = raw?.quoteSummary?.result?.[0];
  if (!r) return null;

  const incomeList: unknown[] = r.incomeStatementHistory?.incomeStatementHistory ?? [];
  const balanceList: unknown[] = r.balanceSheetHistory?.balanceSheetStatements ?? [];
  const cashflowList: unknown[] = r.cashflowStatementHistory?.cashflowStatements ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fd: any = r.financialData ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ks: any = r.defaultKeyStatistics ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sd: any = r.summaryDetail ?? {};

  const currency: string = fd.currency ?? sd.currency ?? "INR";

  const years: FinancialYear[] = incomeList.slice(0, 3).map((inc, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const income = inc as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bal = (balanceList[i] ?? {}) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cf = (cashflowList[i] ?? {}) as any;

    const endFmt: string = income.endDate?.fmt ?? "";
    const year = endFmt ? `FY${endFmt.slice(0, 4)}` : `FY${new Date().getFullYear() - i}`;

    return {
      year,
      revenue: safeRaw(income.totalRevenue),
      grossProfit: safeRaw(income.grossProfit),
      operatingIncome: safeRaw(income.operatingIncome),
      ebitda: safeRaw(income.ebitda),
      netIncome: safeRaw(income.netIncome),
      eps: safeRaw(income.dilutedEPS) ?? safeRaw(income.basicEPS),
      totalAssets: safeRaw(bal.totalAssets),
      totalDebt: safeRaw(bal.totalDebt),
      totalEquity: safeRaw(bal.totalStockholderEquity),
      operatingCashFlow: safeRaw(cf.totalCashFromOperatingActivities),
      capex: safeRaw(cf.capitalExpenditures),
    };
  });

  const ratios: FinancialRatios = {
    roe: safeRaw(fd.returnOnEquity),
    roa: safeRaw(fd.returnOnAssets),
    operatingMargin: safeRaw(fd.operatingMargins),
    profitMargin: safeRaw(fd.profitMargins),
    revenueGrowth: safeRaw(fd.revenueGrowth),
    debtToEquity: safeRaw(fd.debtToEquity),
    currentRatio: safeRaw(fd.currentRatio),
    pe: safeRaw(sd.trailingPE),
    forwardPE: safeRaw(sd.forwardPE),
    pb: safeRaw(ks.priceToBook),
    evEbitda: safeRaw(ks.enterpriseToEbitda),
    marketCap: safeRaw(sd.marketCap),
    dividendYield: safeRaw(sd.dividendYield),
    beta: safeRaw(ks.beta),
  };

  return { name, ticker, currency, years, ratios };
}

async function fetchYahooFinance(ticker: string) {
  const modules = [
    "incomeStatementHistory",
    "balanceSheetHistory",
    "cashflowStatementHistory",
    "financialData",
    "defaultKeyStatistics",
    "summaryDetail",
  ].join(",");

  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status} for ${ticker}`);
  return res.json();
}

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

    if (players.length < 1) {
      return NextResponse.json({ error: "Select at least 1 company" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GOOGLE_AI_API_KEY not configured" }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });

    const companies: FinancialCompanyResult[] = await Promise.all(
      players.map(async (name): Promise<FinancialCompanyResult> => {
        try {
          const ticker = await resolveTicker(ai, name, subsectorName);
          if (!ticker) return { name, error: "Could not resolve ticker — try adding the ticker manually" };

          const raw = await fetchYahooFinance(ticker);
          const data = parseYahooData(raw, name, ticker);
          if (!data) return { name, ticker, error: "No financial data found on Yahoo Finance" };

          return data;
        } catch (err) {
          return { name, error: err instanceof Error ? err.message : "Fetch failed" };
        }
      })
    );

    return NextResponse.json({ companies });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[financials]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
