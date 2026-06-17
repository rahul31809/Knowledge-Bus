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
  return items.slice(0, 5);
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

          // Single Gemini call to summarize all articles
          const articleList = rssItems
            .map(
              (item, i) =>
                `${i + 1}. Title: "${item.title}"\n   Snippet: "${item.snippet}"\n   Source: ${item.source}`
            )
            .join("\n\n");

          const prompt = `You are a financial analyst. Here are recent news articles about ${company}${subsectorName ? ` (${subsectorName} sector)` : ""}:

${articleList}

For each article, write exactly 2 sentences: what happened and why it matters for investors or industry observers. Base your summary only on the title and snippet — do not invent facts.

Return ONLY a JSON array, no markdown fences, no extra text:
[{"index":1,"summary":"..."},{"index":2,"summary":"..."}]`;

          const result = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          });

          const text = result.text?.trim() ?? "";
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          const summaries: { index: number; summary: string }[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
          const summaryMap = Object.fromEntries(summaries.map((s) => [s.index, s.summary]));

          const items: NewsItem[] = rssItems.map((item, i) => ({
            title: item.title,
            summary: summaryMap[i + 1] ?? item.snippet,
            source: item.source || "News",
            date: formatPubDate(item.pubDate),
            url: item.link,
          }));

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
