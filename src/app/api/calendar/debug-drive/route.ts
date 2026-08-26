import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { getDriveClient } from "@/lib/drive-sync/client";

// Temporary debug endpoint — remove after diagnosis.
export async function GET() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const rootFolderId = process.env.DRIVE_SUBJECTS_ROOT_FOLDER_ID ?? null;
  const results: Record<string, unknown> = { rootFolderId };

  try {
    const drive = getDriveClient();

    // 1. Broad name search
    let foundFileId: string | null = null;
    try {
      const res = await drive.files.list({
        q: "name = 'weekly-sessions.xlsx' and trashed = false",
        fields: "files(id, name, modifiedTime, parents)",
        pageSize: 5,
      });
      results.broadSearch = res.data.files ?? [];
      foundFileId = res.data.files?.[0]?.id ?? null;
    } catch (e) {
      results.broadSearch = { error: String(e) };
    }

    // 2. List rootFolderId children
    if (rootFolderId) {
      try {
        const res = await drive.files.list({
          q: `'${rootFolderId}' in parents and trashed = false`,
          fields: "files(id, name, mimeType)",
          pageSize: 30,
        });
        results.rootChildren = res.data.files ?? [];
      } catch (e) {
        results.rootChildren = { error: String(e) };
      }
    }

    // 3. Direct metadata by known file ID
    const knownId = "1N11_xFy2-1MzoPmO2Nx0LEM2XLwy_GNq";
    try {
      const res = await drive.files.get({ fileId: knownId, fields: "id, name, size, trashed, mimeType" });
      results.directById = res.data;
    } catch (e) {
      results.directById = { error: String(e) };
    }

    // 4. Download and inspect raw bytes, then try xlsx parse
    const idToDownload = foundFileId ?? knownId;
    try {
      const res = await drive.files.get(
        { fileId: idToDownload, alt: "media" },
        { responseType: "stream" }
      );
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream = res.data as any;
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", resolve);
        stream.on("error", reject);
      });
      const fileBuffer = Buffer.concat(chunks);
      results.downloadedBytes = fileBuffer.length;
      // Show first 60 bytes as hex to identify file type
      results.first60BytesHex = fileBuffer.slice(0, 60).toString("hex");
      // Also try to read as UTF-8 text (reveals if it's CSV/HTML)
      results.first200AsText = fileBuffer.slice(0, 200).toString("utf-8");

      try {
        const workbook = XLSX.read(fileBuffer.toString("base64"), { type: "base64", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, dateNF: "yyyy-mm-dd" });
        results.xlsxDownload = { ok: true, rowCount: rows.length, firstRow: rows[0] ?? null };
      } catch (e) {
        results.xlsxDownload = { error: String(e) };
      }
    } catch (e) {
      results.downloadError = String(e);
    }
  } catch (e) {
    results.driveClientError = String(e);
  }

  return NextResponse.json(results);
}
