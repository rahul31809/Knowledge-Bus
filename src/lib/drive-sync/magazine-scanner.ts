import { GoogleGenAI, createPartFromUri, FileState } from "@google/genai";
import { MAGAZINE_SECTIONS, type MagazineSection } from "@/lib/types";
import type { DriveFileEntry } from "./client";

// Gemini's inline-data request cap is ~20MB total and base64 inflates raw
// bytes by ~1.33x, so keep a wide margin for the prompt/JSON overhead before
// falling back to the Files API (createPartFromUri) for larger PDFs.
const INLINE_SIZE_LIMIT = 8 * 1024 * 1024;

// How long to wait for an uploaded file to leave the PROCESSING state before
// giving up and referencing it anyway.
const UPLOAD_READY_TIMEOUT_MS = 30000;
const UPLOAD_POLL_INTERVAL_MS = 2000;

const SECTION_LIST = MAGAZINE_SECTIONS.map((s) => `- ${s}`).join("\n");

function normalizeSection(value: unknown): MagazineSection {
  if (typeof value !== "string") return "Other";
  const match = MAGAZINE_SECTIONS.find((s) => s.toLowerCase() === value.trim().toLowerCase());
  return match ?? "Other";
}

export interface ExtractedArticle {
  title: string;
  section: MagazineSection;
}

export async function extractTableOfContents(
  file: DriveFileEntry,
  pdfBytes: ArrayBuffer
): Promise<ExtractedArticle[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return [];

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `This PDF is one issue of a business/management magazine ("${file.name}"). Read its table of contents and list every substantive article or feature in it.

For each article, assign it to exactly one of these categories:
${SECTION_LIST}

Rules:
- Use the article titles exactly as printed in the table of contents.
- Skip non-article entries: masthead, subscription/ad pages, letters to the editor, contributor bios, contents page itself.
- If an article doesn't clearly fit a category, use "Other".
- Output ONLY a valid JSON array of objects with "title" and "section" keys, nothing else.
Example: [{"title": "The New Rules of Competition", "section": "Strategy & Competition"}]`;

  let part: { inlineData: { mimeType: string; data: string } } | ReturnType<typeof createPartFromUri>;

  if (pdfBytes.byteLength <= INLINE_SIZE_LIMIT) {
    part = {
      inlineData: {
        mimeType: "application/pdf",
        data: Buffer.from(pdfBytes).toString("base64"),
      },
    };
  } else {
    let uploaded = await ai.files.upload({
      file: new Blob([pdfBytes], { type: "application/pdf" }),
      config: { mimeType: "application/pdf", displayName: file.name },
    });

    const deadline = Date.now() + UPLOAD_READY_TIMEOUT_MS;
    while (uploaded.state === FileState.PROCESSING && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, UPLOAD_POLL_INTERVAL_MS));
      if (!uploaded.name) break;
      uploaded = await ai.files.get({ name: uploaded.name });
    }

    if (uploaded.state === FileState.FAILED || !uploaded.uri || !uploaded.mimeType) return [];
    part = createPartFromUri(uploaded.uri, uploaded.mimeType);
  }

  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: [prompt, part],
  });

  const text = result.text ?? "";
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is { title: unknown; section: unknown } => typeof item === "object" && item !== null)
      .map((item) => ({
        title: typeof item.title === "string" ? item.title.trim() : "",
        section: normalizeSection(item.section),
      }))
      .filter((item) => item.title.length > 0);
  } catch {
    return [];
  }
}
