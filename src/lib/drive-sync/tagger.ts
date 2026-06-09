import Anthropic from "@anthropic-ai/sdk";
import type { drive_v3 } from "googleapis";
import type { DriveFileEntry } from "./client";

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
const GOOGLE_SLIDES_MIME = "application/vnd.google-apps.presentation";
const PDF_MIME = "application/pdf";
const MAX_CONTENT_CHARS = 4000;

async function exportGoogleWorkspaceAsText(drive: drive_v3.Drive, fileId: string): Promise<string> {
  try {
    const res = await drive.files.export({ fileId, mimeType: "text/plain" }, { responseType: "text" });
    return String(res.data).slice(0, MAX_CONTENT_CHARS);
  } catch {
    return "";
  }
}

async function extractPdfText(drive: drive_v3.Drive, fileId: string): Promise<string> {
  try {
    const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
    // Dynamic import keeps pdf-parse out of the module graph until needed,
    // preventing its test-file side-effect from running at build time.
    const pdfMod = await import("pdf-parse");
    // ESM build exports the callable directly — cast to avoid type mismatch
    const parse = pdfMod as unknown as (buf: Buffer) => Promise<{ text: string }>;
    const data = await parse(Buffer.from(res.data as ArrayBuffer));
    return data.text.slice(0, MAX_CONTENT_CHARS);
  } catch {
    return "";
  }
}

export async function extractFileContent(drive: drive_v3.Drive, file: DriveFileEntry): Promise<string> {
  if (file.mimeType === GOOGLE_DOC_MIME || file.mimeType === GOOGLE_SLIDES_MIME) {
    return exportGoogleWorkspaceAsText(drive, file.id);
  }
  if (file.mimeType === PDF_MIME) {
    return extractPdfText(drive, file.id);
  }
  return "";
}

export async function generateTagsForFile(file: DriveFileEntry, content: string): Promise<string[]> {
  const anthropic = new Anthropic();

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

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (msg.content[0] as { type: string; text: string }).text;
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
