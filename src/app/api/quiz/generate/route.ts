import { NextResponse } from "next/server";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { getDriveClient } from "@/lib/drive-sync/client";
import { extractFileContent } from "@/lib/drive-sync/tagger";
import { generateQuizQuestions, type DifficultyCounts, type FilePart } from "@/lib/quiz/generator";
import type { drive_v3 } from "googleapis";

export const maxDuration = 120;

const SLIDES_MIME = "application/vnd.google-apps.presentation";
const PDF_MIME = "application/pdf";

interface SourceFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

async function downloadAsPdfBase64(drive: drive_v3.Drive, file: SourceFile): Promise<string | null> {
  try {
    if (file.mimeType === SLIDES_MIME) {
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

export async function POST(request: Request) {
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as { subject?: string; files?: SourceFile[]; counts?: DifficultyCounts };
    const { subject, files, counts } = body;
    if (!subject || !files?.length || !counts) {
      return NextResponse.json({ error: "Missing subject, files, or counts" }, { status: 400 });
    }
    if (counts.easy + counts.medium + counts.hard <= 0) {
      return NextResponse.json({ error: "Request at least one question" }, { status: 400 });
    }

    const drive = getDriveClient();
    const parts: FilePart[] = await Promise.all(
      files.map(async (file): Promise<FilePart> => {
        const pdfBase64 = await downloadAsPdfBase64(drive, file);
        if (pdfBase64) {
          return { type: "pdf", name: file.name, pdfBase64 };
        }
        // PPTX fallback: extract text via JSZip
        const text = await extractFileContent(drive, file, 8000);
        return { type: "text", name: file.name, text: text.trim() };
      })
    );

    const questions = await generateQuizQuestions(subject, parts, counts);
    return NextResponse.json({ questions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[quiz-generate]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
