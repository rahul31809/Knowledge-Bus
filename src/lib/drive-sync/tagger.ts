import { GoogleGenAI } from "@google/genai";
import type { drive_v3 } from "googleapis";
import type { DriveFileEntry } from "./client";

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
const GOOGLE_SLIDES_MIME = "application/vnd.google-apps.presentation";
const PDF_MIME = "application/pdf";
const MAX_CONTENT_CHARS = 4000;

async function exportGoogleWorkspaceAsText(drive: drive_v3.Drive, fileId: string, maxChars: number): Promise<string> {
  try {
    const res = await drive.files.export({ fileId, mimeType: "text/plain" }, { responseType: "text" });
    return String(res.data).slice(0, maxChars);
  } catch {
    return "";
  }
}

// pdf-parse's bundled pdfjs-dist has multiple serverless incompatibilities
// (DOMMatrix global missing, fake-worker module not bundled by Vercel's file
// tracing). Fall back to filename-only tagging on any extraction failure
// rather than crashing the file's tagging run.
async function extractPdfText(drive: drive_v3.Drive, fileId: string, maxChars: number): Promise<string> {
  try {
    const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(res.data as ArrayBuffer) });
    const result = await parser.getText();
    await parser.destroy();
    return result.text.slice(0, maxChars);
  } catch {
    return "";
  }
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
