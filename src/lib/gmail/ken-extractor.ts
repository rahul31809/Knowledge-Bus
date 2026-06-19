import { GoogleGenAI } from "@google/genai";

export interface ExtractedArticle {
  title: string;
  url: string;
  snippet: string;
}

function cleanEmailHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/\s(width|height|align|role|border)="[^"]*"/gi, "")
    .slice(0, 20000);
}

export async function extractKenArticles(html: string): Promise<ExtractedArticle[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return [];

  const cleaned = cleanEmailHtml(html);
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Extract every distinct article/story referenced in this newsletter email HTML from "The Ken". For each, give the headline, the article URL (must contain "the-ken.com"), and a one-sentence snippet/description if one appears nearby in the HTML.

Ignore navigation links, footer links, unsubscribe/email-preferences links, social links, "upgrade now"/pricing/subscription links, writer bio links, and community-comment sections — only real article/story links.

Return ONLY a JSON array, no markdown fences, no extra text:
[{"title": "...", "url": "...", "snippet": "..."}]

HTML:
${cleaned}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    const text = result.text ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const articles: ExtractedArticle[] = [];
    for (const item of parsed) {
      if (typeof item !== "object" || !item) continue;
      const { title, url, snippet } = item as Record<string, unknown>;
      if (typeof title !== "string" || typeof url !== "string" || !url.includes("the-ken.com")) continue;
      const cleanUrl = url.split("?")[0];
      if (seen.has(cleanUrl)) continue;
      seen.add(cleanUrl);
      articles.push({ title: title.trim(), url: cleanUrl, snippet: typeof snippet === "string" ? snippet.trim() : "" });
    }
    return articles;
  } catch {
    return [];
  }
}
