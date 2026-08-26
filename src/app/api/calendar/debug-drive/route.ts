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
    try {
      const res = await drive.files.list({
        q: "name = 'weekly-sessions.xlsx' and trashed = false",
        fields: "files(id, name, modifiedTime, parents)",
        pageSize: 5,
      });
      results.broadSearch = res.data.files ?? [];
    } catch (e) {
      results.broadSearch = { error: String(e) };
    }

    // 2. List Academics (rootFolderId) children — looking for Calendar subfolder
    if (rootFolderId) {
      try {
        const res = await drive.files.list({
          q: `'${rootFolderId}' in parents and trashed = false`,
          fields: "files(id, name, mimeType)",
          pageSize: 30,
        });
        results.academicsChildren = res.data.files ?? [];
      } catch (e) {
        results.academicsChildren = { error: String(e) };
      }
    }

    // 3. Direct access by known file ID
    const knownId = "1N11_xFy2-1MzoPmO2Nx0LEM2XLwy_GNq";
    try {
      const res = await drive.files.get({ fileId: knownId, fields: "id, name, size, trashed" });
      results.directById = res.data;
    } catch (e) {
      results.directById = { error: String(e) };
    }
  } catch (e) {
    results.driveClientError = String(e);
  }

  return NextResponse.json(results);
}
