import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { getDriveClient } from "@/lib/drive-sync/client";
import { extractFileContent, generateArticleSummary } from "@/lib/drive-sync/tagger";
import type { DriveFileTag } from "@/lib/types";

// PDF text extraction + a Gemini call can take a little while for large issues.
export const maxDuration = 60;

const SUMMARY_CONTENT_CHARS = 20000;

export async function POST(request: Request) {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const fileId = body?.fileId;
  if (typeof fileId !== "string" || !fileId) {
    return NextResponse.json({ ok: false, error: "fileId is required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json({ ok: false, error: "Drive/AI is not configured" }, { status: 500 });
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: fileTag, error: fetchError } = await supabase
    .from("drive_file_tags")
    .select("*")
    .eq("file_id", fileId)
    .maybeSingle();

  if (fetchError || !fileTag) {
    return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
  }

  const row = fileTag as DriveFileTag;

  // Serve a cached summary if one was already generated for this file.
  if (row.ai_summary) {
    return NextResponse.json({ ok: true, summary: row.ai_summary, cached: true });
  }

  const drive = getDriveClient();
  const fileEntry = { id: row.file_id, name: row.file_name, mimeType: row.mime_type, webViewLink: row.web_view_link };

  let content: string;
  try {
    content = await extractFileContent(drive, fileEntry, SUMMARY_CONTENT_CHARS);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: `Could not read file content: ${message}` }, { status: 500 });
  }

  if (!content.trim()) {
    return NextResponse.json({ ok: false, error: "No extractable text found in this file" }, { status: 500 });
  }

  let summary: string;
  try {
    summary = await generateArticleSummary(fileEntry, content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: `AI summary call failed: ${message}` }, { status: 500 });
  }

  if (!summary) {
    return NextResponse.json({ ok: false, error: "Could not generate a summary for this file" }, { status: 500 });
  }

  await supabase
    .from("drive_file_tags")
    .update({ ai_summary: summary, summary_generated_at: new Date().toISOString() })
    .eq("file_id", row.file_id);

  return NextResponse.json({ ok: true, summary, cached: false });
}
