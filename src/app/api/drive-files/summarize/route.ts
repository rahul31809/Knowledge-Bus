import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { getDriveClient } from "@/lib/drive-sync/client";
import { extractFileContent, generateSummaryForFile } from "@/lib/drive-sync/tagger";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await createSessionClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId, fileName, mimeType, webViewLink, subject } = (await request.json()) as {
      fileId?: string;
      fileName?: string;
      mimeType?: string;
      webViewLink?: string;
      subject?: string;
    };
    if (!fileId || !fileName || !mimeType || !webViewLink || !subject) {
      return NextResponse.json({ error: "Missing required file fields" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server is not configured" }, { status: 500 });
    }
    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const drive = getDriveClient();
    const content = await extractFileContent(drive, { id: fileId, name: fileName, mimeType, webViewLink }, 8000);
    const summary = await generateSummaryForFile({ id: fileId, name: fileName, mimeType, webViewLink }, content);

    const generatedAt = new Date().toISOString();
    const { error } = await supabase.from("drive_file_tags").upsert(
      {
        file_id: fileId,
        subject,
        file_name: fileName,
        mime_type: mimeType,
        web_view_link: webViewLink,
        ai_summary: summary,
        summary_generated_at: generatedAt,
      },
      { onConflict: "file_id" }
    );
    if (error) throw error;

    return NextResponse.json({ ok: true, summary, generatedAt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[summarize-drive-file]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
