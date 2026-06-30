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

// pdf-parse's bundled pdfjs-dist needs @napi-rs/canvas for its DOMMatrix
// polyfill, and Vercel's file tracer doesn't pick up that dynamic require
// even when externalized — text extraction silently returns empty on
// every PDF in production. unpdf wraps a serverless build of pdfjs-dist
// that skips the canvas-dependent code paths entirely for plain text
// extraction, so it has no such dependency to fail to trace.
async function extractPdfText(drive: drive_v3.Drive, fileId: string, maxChars: number): Promise<string> {
  try {
    const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
    const { extractText } = await import("unpdf");
    const { text } = await extractText(new Uint8Array(res.data as ArrayBuffer), { mergePages: true });
    return text.slice(0, maxChars);
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

export async function generateSummaryForFile(file: DriveFileEntry, content: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
  if (!content.trim()) throw new Error("No extractable text content for this file");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an MBA tutor at SPJIMR teaching this material for genuine understanding, not just summarizing it. Two principles: (1) relational over instrumental — teach the reasoning behind an idea, not just the idea, so it transfers to situations not seen before; (2) fight the illusion of competence — a fluent read-through feels like learning but isn't, so end with self-check questions that force recall rather than recognition.

File: "${file.name}"

Content:
${content.trim()}

Produce a condensed Professor-Mode study note in markdown, grounded only in claims the content actually supports. Structure:

## The big picture
1-2 sentences: the one question this material answers, and why it matters to a manager or decision-maker.

## Core concepts
For each key idea in the material (2-5 of them, fewer if the material is thin): give the intuition first in plain language with one sharp analogy if useful, then the precise framework/definition/formula.

## Real-world application
One concrete example, situation, or company tie-in that makes this material's content concrete rather than abstract.

## Common traps
1-3 specific misconceptions or mistakes a learner is likely to make with this exact material, each with why it's wrong. Skip this section if the material is too short/simple for any.

## Test yourself
2-3 questions rising in difficulty (recall, then apply). Since this is a static note, include each answer directly beneath its question rather than withholding it.

Keep the whole note tight (roughly 300-450 words) — this is a study note for one document, not a full lesson. Output ONLY the markdown note, no preamble or closing remarks.`;

  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });

  const text = result.text?.trim();
  if (!text) throw new Error("Gemini returned an empty summary");
  return text;
}
