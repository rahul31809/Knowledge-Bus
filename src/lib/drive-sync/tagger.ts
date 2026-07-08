import { GoogleGenAI } from "@google/genai";
import type { drive_v3 } from "googleapis";
import type { DriveFileEntry } from "./client";

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
const GOOGLE_SLIDES_MIME = "application/vnd.google-apps.presentation";
const PDF_MIME = "application/pdf";
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
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

// Uploaded .pptx files (as opposed to native Google Slides) aren't
// exportable via the Drive API's export endpoint — that only works for
// Google's own Workspace formats. A .pptx is just a zip of XML, though:
// unzip it and pull every <a:t> text run out of each slide's XML, in slide
// order. Pure JS, no native bindings — same serverless-safety reasoning
// that ruled out pdf-parse's canvas dependency applies here too.
async function extractPptxText(drive: drive_v3.Drive, fileId: string, maxChars: number): Promise<string> {
  try {
    const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(res.data as ArrayBuffer);
    const slideFiles = Object.keys(zip.files)
      .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => Number(a.match(/slide(\d+)/)![1]) - Number(b.match(/slide(\d+)/)![1]));

    let text = "";
    for (const f of slideFiles) {
      const xml = await zip.files[f].async("string");
      const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
      text += runs.join(" ") + "\n\n";
      if (text.length >= maxChars) break;
    }
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
  if (file.mimeType === PPTX_MIME) {
    return extractPptxText(drive, file.id, maxChars);
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

// Downloads a Drive file as a base64-encoded PDF. Works for native Google
// Slides (exported via Drive API) and native PDFs (downloaded directly).
// Returns null for PPTX and other binary formats that can't be exported.
export async function downloadAsPdfBase64(
  drive: drive_v3.Drive,
  file: { id: string; mimeType: string }
): Promise<string | null> {
  try {
    if (file.mimeType === GOOGLE_SLIDES_MIME) {
      const res = await drive.files.export(
        { fileId: file.id, mimeType: "application/pdf" },
        { responseType: "arraybuffer" }
      );
      return Buffer.from(res.data as ArrayBuffer).toString("base64");
    }
    if (file.mimeType === PDF_MIME) {
      const res = await drive.files.get(
        { fileId: file.id, alt: "media" },
        { responseType: "arraybuffer" }
      );
      return Buffer.from(res.data as unknown as ArrayBuffer).toString("base64");
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateSummaryForFile(
  file: DriveFileEntry,
  { pdfBase64, text: fallbackText }: { pdfBase64?: string; text?: string }
): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
  if (!pdfBase64 && !fallbackText?.trim()) throw new Error("No content available for this file");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an MBA tutor at SPJIMR. You have been given a pre-read document — study it fully, including any diagrams, tables, and visual content.

File: "${file.name}"

Two non-negotiable principles: (1) relational over instrumental — teach the reasoning behind each idea so it transfers to new situations, not just the definition; (2) fight the illusion of competence — a fluent read feels like learning but isn't; the self-check must force genuine recall.

Produce a condensed Professor-Mode study note in markdown. Structure:

## The big picture
1-2 sentences: the one question this material answers and why it matters to a manager or decision-maker.

## Core concepts
For each key idea (2-5, fewer if the material is thin): intuition first in plain language with one sharp analogy if useful, then the precise framework/definition/formula. Build each on the last.

## Worked example
One concrete, business-flavored worked example that walks the main concept or framework through a real or realistic situation. For quantitative material, show the calculation and narrate each step. For qualitative material, walk a company or decision through the framework.

## Common traps
1-3 specific misconceptions a learner is likely to hold about this material, each with why it is wrong. Skip if the material is too short or simple.

## Test yourself
3 questions rising in difficulty: recall → apply → analyse. Include the answer beneath each question (this is a static note, not a live quiz).

## Quick recap
One short paragraph (3-5 sentences) compressing the whole note — key terms, the framework(s), any formula. Something to glance at before a quiz.

Target 450-600 words total. Output ONLY the markdown note, no preamble or closing remarks.`;

  const contentParts: object[] = [];
  if (pdfBase64) {
    contentParts.push({ inlineData: { mimeType: "application/pdf", data: pdfBase64 } });
  } else if (fallbackText) {
    contentParts.push({ text: `Document content:\n${fallbackText.trim()}` });
  }
  contentParts.push({ text: prompt });

  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: [{ role: "user", parts: contentParts }],
  });

  const summary = result.text?.trim();
  if (!summary) throw new Error("Gemini returned an empty summary");
  return summary;
}
