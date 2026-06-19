import { GoogleGenAI } from "@google/genai";
import { NEWS_SECTIONS, type NewsSection } from "@/lib/types";

const SECTION_HINTS: Partial<Record<NewsSection, string>> = {
  "AI & Emerging Tech": "AI models/tools/research, AI adoption or integration within any industry or value chain, and other emerging tech",
};

const SECTION_LIST = NEWS_SECTIONS.map((section) => {
  const hint = SECTION_HINTS[section];
  return hint ? `- ${section} (${hint})` : `- ${section}`;
}).join("\n");
const CHUNK_SIZE = 30;
const CHUNK_DELAY_MS = 4000;

export interface CategorizeInput {
  title: string;
  summary: string;
}

function normalizeSection(value: unknown): NewsSection {
  if (typeof value !== "string") return "Other";
  const trimmed = value.trim().toLowerCase();
  const match = NEWS_SECTIONS.find((section) => section.toLowerCase() === trimmed);
  return match ?? "Other";
}

async function categorizeChunk(ai: GoogleGenAI, items: CategorizeInput[]): Promise<NewsSection[]> {
  const list = items
    .map((item, i) => `${i + 1}. Title: ${item.title}\n   Summary: ${item.summary}`)
    .join("\n");

  const prompt = `Classify each of these ${items.length} news articles into exactly one of these categories:
${SECTION_LIST}

Articles:
${list}

Output ONLY a valid JSON array of exactly ${items.length} strings (the category for each article, in the same order as listed above), nothing else.
Example: ["Markets & Investing", "Energy & Infrastructure"]`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    const text = result.text ?? "";
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return items.map(() => "Other");

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return items.map(() => "Other");

    return items.map((_, i) => normalizeSection(parsed[i]));
  } catch {
    return items.map(() => "Other");
  }
}

export async function categorizeArticles(items: CategorizeInput[]): Promise<NewsSection[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || items.length === 0) {
    return items.map(() => "Other");
  }

  const ai = new GoogleGenAI({ apiKey });
  const results: NewsSection[] = [];

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    results.push(...(await categorizeChunk(ai, chunk)));

    if (i + CHUNK_SIZE < items.length) {
      await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
    }
  }

  return results;
}
