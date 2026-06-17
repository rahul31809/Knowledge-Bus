import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export interface NewsItem {
  title: string;
  summary: string;
  source: string;
  date: string;
  url: string;
}

export interface CompanyNewsResult {
  company: string;
  items: NewsItem[];
  error?: string;
}

interface CompanyNewsRequestBody {
  companies?: string[];
  industryName?: string;
  subsectorName?: string;
}

function extractTag(block: string, tag: string): string {
  const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
  if (cdata) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`));
  return (plain?.[1] ?? "").trim();
}

function parseRss(xml: string) {
  const items: Array<{ title: string; link: string; pubDate: string; snippet: string; source: string }> = [];
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  for (const block of blocks) {
    const rawTitle = extractTag(block, "title");
    // Google News titles often end with " - Source Name"
    const dashIdx = rawTitle.lastIndexOf(" - ");
    const title = dashIdx > 0 ? rawTitle.slice(0, dashIdx).trim() : rawTitle;
    const source = dashIdx > 0 ? rawTitle.slice(dashIdx + 3).trim() : extractTag(block, "source");
    const link = extractTag(block, "link") || extractTag(block, "guid");
    const pubDate = extractTag(block, "pubDate");
    const snippet = extractTag(block, "description").replace(/<[^>]+>/g, "").slice(0, 300).trim();
    if (title) items.push({ title, link, pubDate, snippet, source });
  }
  return items.slice(0, 15);
}

function formatPubDate(raw: string): string {
  try {
    return new Date(raw).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return raw;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as CompanyNewsRequestBody;
    const companies = Array.isArray(body.companies) ? body.companies.filter(Boolean) : [];
    const subsectorName = body.subsectorName?.trim() ?? "";

    if (companies.length < 1) {
      return NextResponse.json({ error: "Select at least one company" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GOOGLE_AI_API_KEY not configured" }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });

    const results = await Promise.all(
      companies.map(async (company): Promise<CompanyNewsResult> => {
        try {
          // Fetch real-time news from Google News RSS
          const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(company + " India")}&hl=en-IN&gl=IN&ceid=IN:en`;
          const rssRes = await fetch(rssUrl, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(10000),
          });
          if (!rssRes.ok) throw new Error(`RSS fetch failed: ${rssRes.status}`);
          const xml = await rssRes.text();
          const rssItems = parseRss(xml);

          if (rssItems.length === 0) {
            return { company, items: [], error: "No recent news found." };
          }

          const today = new Date().toISOString().slice(0, 10);
          const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

          const articleList = rssItems
            .map(
              (item, i) =>
                `[${i + 1}] Title: "${item.title}" | Source: ${item.source || "Unknown"} | Date: ${item.pubDate} | Snippet: "${item.snippet}"`
            )
            .join("\n");

          const prompt = `You are a senior equity analyst. Below are ${rssItems.length} raw news items about ${company}${subsectorName ? ` (${subsectorName} sector)` : ""} fetched from Google News. Today is ${today}.

${articleList}

Instructions:
1. EXCLUDE any article published before ${cutoff} (older than 90 days). If all articles are older than 90 days, return an empty array [].
2. GROUP articles that cover the same underlying event or story (same deal, same result, same announcement).
3. From each group, SELECT the one from the most credible source. Credibility order (high to low): Reuters, Bloomberg, Financial Times, Economic Times, Mint, Business Standard, Hindu BusinessLine, Livemint, MoneyControl, then others.
4. After deduplication, keep at most 5 unique stories. Prioritise significance — earnings, deals, regulatory actions, leadership changes, capacity expansions over routine updates.
5. For each selected article, write a detailed 4-6 sentence analytical summary covering: what exactly happened, immediate business/financial impact, strategic significance for the company, broader industry implication. Do not invent facts not in the title/snippet.

Return ONLY a JSON array (no markdown, no extra text). Use the original article index for "index":
[{"index":1,"title":"...","source":"...","date":"...","summary":"..."}]`;

          const result = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          });

          const text = result.text?.trim() ?? "";
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          const selected: { index: number; title: string; source: string; date: string; summary: string }[] =
            jsonMatch ? JSON.parse(jsonMatch[0]) : [];

          const items: NewsItem[] = selected.map((s) => {
            const original = rssItems[s.index - 1];
            return {
              title: s.title || original?.title || "",
              summary: s.summary,
              source: s.source || original?.source || "News",
              date: s.date ? formatPubDate(s.date) : formatPubDate(original?.pubDate ?? ""),
              url: original?.link ?? "",
            };
          });

          return { company, items };
        } catch (err) {
          console.error(`[company-news] ${company}:`, err);
          return { company, items: [], error: "Failed to fetch news. Please try again." };
        }
      })
    );

    return NextResponse.json({ companies: results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[company-news]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
