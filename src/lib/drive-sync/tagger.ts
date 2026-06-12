import { GoogleGenAI } from "@google/genai";
import type { drive_v3 } from "googleapis";
import type { DriveFileEntry } from "./client";

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
const GOOGLE_SLIDES_MIME = "application/vnd.google-apps.presentation";
const PDF_MIME = "application/pdf";
const MAX_CONTENT_CHARS = 4000;

// Cap pages parsed for PDFs — books can run 300+ pages, and we only ever
// use the first MAX_CONTENT_CHARS-ish of text anyway. Keeps memory/CPU
// bounded in serverless.
const MAX_PDF_PAGES = 30;

async function exportGoogleWorkspaceAsText(drive: drive_v3.Drive, fileId: string, maxChars: number): Promise<string> {
  const res = await drive.files.export({ fileId, mimeType: "text/plain" }, { responseType: "text" });
  return String(res.data).slice(0, maxChars);
}

async function extractPdfText(drive: drive_v3.Drive, fileId: string, maxChars: number): Promise<string> {
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
  // Dynamic import keeps pdf-parse out of the module graph until needed,
  // preventing its test-file side-effect from running at build time.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(res.data as ArrayBuffer) });
  const result = await parser.getText({ first: MAX_PDF_PAGES });
  await parser.destroy();
  return result.text.slice(0, maxChars);
}

export async function extractFileContent(
  drive: drive_v3.Drive,
  file: DriveFileEntry,
  maxChars: number = MAX_CONTENT_CHARS
): Promise<string> {
  if (file.mimeType === GOOGLE_DOC_MIME || file.mimeType === GOOGLE_SLIDES_MIME) {
    return exportGoogleWorkspaceAsText(drive, file.id, maxChars);
  }
  if (file.mimeType === PDF_MIME) {
    return extractPdfText(drive, file.id, maxChars);
  }
  return "";
}

export async function generateTagsForFile(file: DriveFileEntry, content: string): Promise<string[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return [];

  const ai = new GoogleGenAI({ apiKey });

  const contentSection = content.trim() ? `\n\nContent excerpt:\n${content.trim()}` : "";

  const prompt = `You are tagging study materials for an MBA student. Generate 6-10 concise tags for this document.

File: "${file.name}"
Type: ${file.mimeType}${contentSection}

Tag categories to cover:
- Business domain: strategy, marketing, finance, operations, leadership, economics, organizational-behavior, entrepreneurship
- Key concepts/frameworks: porter-five-forces, swot, bcg-matrix, npv, vrio, balanced-scorecard, etc.
- Content type: case-study, pre-read, lecture-slides, article, report, framework, assignment
- Industry (if relevant): energy, technology, fmcg, banking, manufacturing, healthcare, etc.

Rules: lowercase, use hyphens for multi-word tags, no generic tags like "document" or "file", only tags useful for finding this content later.
Output ONLY a valid JSON array of strings, nothing else.
Example: ["strategy", "porter-five-forces", "case-study", "competitive-advantage", "industry-analysis"]`;

  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });
  const text = result.text ?? "";
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string").map((t) => t.toLowerCase().trim())
      : [];
  } catch {
    return [];
  }
}

export async function generateArticleSummary(file: DriveFileEntry, content: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || !content.trim()) return "";

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are helping an MBA student (preparing for strategy-consulting interviews) quickly digest a saved reading.

File: "${file.name}"

Content excerpt (may be a full magazine issue rather than a single article):
${content.trim()}

Write a concise summary (150-250 words, plain text, no markdown headers) that:
- Leads with the core thesis / so-what
- Covers key facts, data points, or examples
- Notes why this matters for business strategy or a consulting case discussion

If the excerpt spans multiple articles, focus on the one matching the filename above (e.g. a "Read Article ..." hint); otherwise summarize the most prominent article in the excerpt.`;

  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });
  return (result.text ?? "").trim();
}
