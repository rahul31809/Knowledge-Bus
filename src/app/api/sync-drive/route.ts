import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { exportDocAsText, findMasterNotesDoc, getDriveClient, listSubfolders } from "@/lib/drive-sync/client";
import { parseSessionBlocks, plainTextToHtml } from "@/lib/drive-sync/parser";
import { sanitizeBodyHtml, htmlToPlainText } from "@/lib/sanitize";

interface SubjectSyncResult {
  subject: string;
  status: "synced" | "unchanged" | "no master notes doc found" | "error";
  sessionsUpserted?: number;
  error?: string;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const rootFolderId = process.env.DRIVE_SUBJECTS_ROOT_FOLDER_ID;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rootFolderId || !supabaseUrl || !serviceRoleKey || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return NextResponse.json({ ok: false, error: "Drive sync is not configured" }, { status: 500 });
  }

  const drive = getDriveClient();
  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const subjectFolders = await listSubfolders(drive, rootFolderId);
  const results: SubjectSyncResult[] = [];

  for (const folder of subjectFolders) {
    const subject = folder.name;
    try {
      const doc = await findMasterNotesDoc(drive, folder.id);
      if (!doc) {
        results.push({ subject, status: "no master notes doc found" });
        continue;
      }

      const { data: lastSync } = await supabase
        .from("knowledge_entries")
        .select("drive_synced_at")
        .eq("drive_file_id", doc.id)
        .not("drive_synced_at", "is", null)
        .order("drive_synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastSync?.drive_synced_at && lastSync.drive_synced_at >= doc.modifiedTime) {
        results.push({ subject, status: "unchanged" });
        continue;
      }

      const docText = await exportDocAsText(drive, doc.id);
      const blocks = parseSessionBlocks(docText);
      const syncedAt = new Date().toISOString();
      let sessionsUpserted = 0;

      for (const block of blocks) {
        const sessionLabel = `Session ${block.sessionNumber}`;
        const bodyHtmlRaw = plainTextToHtml(block.bodyText);
        const body_html = sanitizeBodyHtml(bodyHtmlRaw);
        const body_text = htmlToPlainText(bodyHtmlRaw);

        const { data: existingRow } = await supabase
          .from("knowledge_entries")
          .select("id")
          .eq("drive_file_id", doc.id)
          .eq("session_label", sessionLabel)
          .maybeSingle();

        if (existingRow) {
          const { error } = await supabase
            .from("knowledge_entries")
            .update({ title: block.topic, body_html, body_text, drive_synced_at: syncedAt })
            .eq("id", existingRow.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("knowledge_entries").insert({
            title: block.topic,
            entry_type: "study_notes",
            subject,
            session_label: sessionLabel,
            subject_tags: [],
            entry_date: syncedAt.slice(0, 10),
            summary: null,
            body_html,
            body_text,
            drive_file_id: doc.id,
            drive_synced_at: syncedAt,
          });
          if (error) throw error;
        }

        sessionsUpserted += 1;
      }

      results.push({ subject, status: "synced", sessionsUpserted });
    } catch (err) {
      results.push({ subject, status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ ok: true, syncedAt: new Date().toISOString(), results });
}
