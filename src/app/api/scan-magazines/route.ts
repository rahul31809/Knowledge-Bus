import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { getDriveClient, listSubjectFolders, listSubjectFiles } from "@/lib/drive-sync/client";
import { extractTableOfContents } from "@/lib/drive-sync/magazine-scanner";

const PDF_MIME = "application/pdf";
const MAGAZINES_SUBJECT = "News Paper and Magazines";

// Only these subfolders of "News Paper and Magazines" hold magazine issues
// worth a table-of-contents scan — others (Books, EPW Weekly, Bloomberg
// Business, WEF, HBR/10 Must Reads, etc.) are excluded by request. Keys are
// the folder path relative to the subject folder; values are the "source"
// label stored on each issue.
const ALLOWED_MAGAZINE_FOLDERS: Record<string, string> = {
  "Business Today": "Business Today",
  "HBR/Monthly Mags": "HBR",
  "McKinsey Insights": "McKinsey Insights",
  "MIT": "MIT",
  "The Economist": "The Economist",
};

// PDF table-of-contents extraction via Gemini takes longer per file than the
// plain-text tagging in /api/tag-drive-files, so allow the full 5 minutes
// and space calls further apart.
export const maxDuration = 300;

interface IssueResult {
  fileId: string;
  fileName: string;
  status: "scanned" | "unchanged" | "error";
  articleCount?: number;
  error?: string;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Called by cron or curl with the secret — allowed
  } else {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) {
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

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : Infinity;

  const subjectFolders = await listSubjectFolders(drive, rootFolderId);
  const magazinesFolder = subjectFolders.find((f) => f.name === MAGAZINES_SUBJECT);

  if (!magazinesFolder) {
    return NextResponse.json({ ok: false, error: `"${MAGAZINES_SUBJECT}" folder not found in Drive` }, { status: 404 });
  }

  const fileGroups = await listSubjectFiles(drive, magazinesFolder.id);

  const candidates = fileGroups
    .filter((group) => group.folderName !== null && group.folderName in ALLOWED_MAGAZINE_FOLDERS)
    .flatMap((group) =>
      group.files
        .filter((file) => file.mimeType === PDF_MIME)
        .map((file) => ({ file, source: ALLOWED_MAGAZINE_FOLDERS[group.folderName!] }))
    )
    .slice(0, limit);

  const results: IssueResult[] = [];

  for (const { file, source } of candidates) {
    const { data: existing } = await supabase
      .from("magazine_issues")
      .select("drive_modified_time")
      .eq("file_id", file.id)
      .maybeSingle();

    if (file.modifiedTime && existing?.drive_modified_time === file.modifiedTime) {
      results.push({ fileId: file.id, fileName: file.name, status: "unchanged" });
      continue;
    }

    try {
      const res = await drive.files.get({ fileId: file.id, alt: "media" }, { responseType: "arraybuffer" });
      const articles = await extractTableOfContents(file, res.data as ArrayBuffer);

      if (articles.length === 0) {
        throw new Error("No articles extracted from table of contents");
      }

      const { error: issueError } = await supabase.from("magazine_issues").upsert({
        file_id: file.id,
        source,
        file_name: file.name,
        web_view_link: file.webViewLink,
        drive_modified_time: file.modifiedTime ?? null,
        toc_extracted_at: new Date().toISOString(),
      });
      if (issueError) throw issueError;

      const { error: deleteError } = await supabase.from("magazine_articles").delete().eq("issue_file_id", file.id);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase.from("magazine_articles").insert(
        articles.map((article, index) => ({
          issue_file_id: file.id,
          title: article.title,
          section: article.section,
          order_index: index,
        }))
      );
      if (insertError) throw insertError;

      results.push({ fileId: file.id, fileName: file.name, status: "scanned", articleCount: articles.length });
    } catch (err) {
      results.push({
        fileId: file.id,
        fileName: file.name,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Whole magazine-issue PDFs burn far more of the free-tier per-minute
    // token budget than the plain-text tagging calls in /api/tag-drive-files
    // — space these out more to avoid RESOURCE_EXHAUSTED (429) errors.
    await new Promise((resolve) => setTimeout(resolve, 12000));
  }

  const scanned = results.filter((r) => r.status === "scanned").length;
  const unchanged = results.filter((r) => r.status === "unchanged").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ ok: true, scannedAt: new Date().toISOString(), scanned, unchanged, errors, results });
}
