import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getDriveClient, listSubfolders, listSubjectFiles, type DriveFileEntry } from "@/lib/drive-sync/client";
import { extractFileContent, generateTagsForFile } from "@/lib/drive-sync/tagger";

// Allow up to 5 minutes — processing many files with content extraction + AI calls
// takes time. Requires Vercel Pro; on Hobby the default 10 s limit applies, so
// call with ?subject=<name> to tag one subject at a time.
export const maxDuration = 300;

interface FileResult {
  fileId: string;
  fileName: string;
  status: "tagged" | "unchanged" | "error";
  tags?: string[];
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
    return NextResponse.json({ ok: false, error: "Drive is not configured" }, { status: 500 });
  }
  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json({ ok: false, error: "GOOGLE_AI_API_KEY is not set" }, { status: 500 });
  }

  const drive = getDriveClient();
  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Optional ?subject=<name> to tag a single subject — useful on Hobby plan
  const url = new URL(request.url);
  const targetSubject = url.searchParams.get("subject");

  const subjectFolders = await listSubfolders(drive, rootFolderId);
  const results: { subject: string; files: FileResult[] }[] = [];

  for (const folder of subjectFolders) {
    if (targetSubject && folder.name !== targetSubject) continue;

    const fileGroups = await listSubjectFiles(drive, folder.id);
    const allFiles: DriveFileEntry[] = fileGroups.flatMap((g) => g.files);
    const fileResults: FileResult[] = [];

    for (const file of allFiles) {
      try {
        // Skip if already tagged with the same Drive modifiedTime
        if (file.modifiedTime) {
          const { data: existing } = await supabase
            .from("drive_file_tags")
            .select("drive_modified_time")
            .eq("file_id", file.id)
            .maybeSingle();

          if (existing?.drive_modified_time === file.modifiedTime) {
            fileResults.push({ fileId: file.id, fileName: file.name, status: "unchanged" });
            continue;
          }
        }

        const content = await extractFileContent(drive, file);
        const tags = await generateTagsForFile(file, content);

        const { error } = await supabase.from("drive_file_tags").upsert({
          file_id: file.id,
          subject: folder.name,
          file_name: file.name,
          mime_type: file.mimeType,
          web_view_link: file.webViewLink,
          tags,
          drive_modified_time: file.modifiedTime ?? null,
          tagged_at: new Date().toISOString(),
        });

        if (error) throw error;
        fileResults.push({ fileId: file.id, fileName: file.name, status: "tagged", tags });
      } catch (err) {
        fileResults.push({
          fileId: file.id,
          fileName: file.name,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    results.push({ subject: folder.name, files: fileResults });
  }

  const tagged = results.flatMap((r) => r.files).filter((f) => f.status === "tagged").length;
  const unchanged = results.flatMap((r) => r.files).filter((f) => f.status === "unchanged").length;
  const errors = results.flatMap((r) => r.files).filter((f) => f.status === "error").length;

  return NextResponse.json({ ok: true, taggedAt: new Date().toISOString(), tagged, unchanged, errors, results });
}
