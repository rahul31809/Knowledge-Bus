import { NextResponse } from "next/server";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { getDriveClient } from "@/lib/drive-sync/client";
import { extractFileContent } from "@/lib/drive-sync/tagger";
import { generateQuizQuestions, type DifficultyCounts } from "@/lib/quiz/generator";

export const maxDuration = 90;

const PER_FILE_MAX_CHARS = 6000;
const TOTAL_MAX_CHARS = 24000;

interface SourceFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
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
    const chunks = await Promise.all(
      files.map(async (file) => {
        const text = await extractFileContent(drive, file, PER_FILE_MAX_CHARS);
        return text.trim() ? `--- ${file.name} ---\n${text.trim()}` : "";
      })
    );
    const content = chunks.filter(Boolean).join("\n\n").slice(0, TOTAL_MAX_CHARS);

    const questions = await generateQuizQuestions(subject, content, counts);
    return NextResponse.json({ questions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[quiz-generate]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
