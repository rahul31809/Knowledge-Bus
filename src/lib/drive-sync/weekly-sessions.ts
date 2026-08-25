import * as XLSX from "xlsx";
import { getDriveClient } from "./client";

const WEEKLY_SESSIONS_FILENAME = "weekly-sessions.xlsx";
const CALENDAR_FOLDER_NAME = "Calendar";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export interface RawCalendarRow {
  date: string;
  time: string | null;
  title: string;
}

function findColumn(row: Record<string, unknown>, candidates: string[]): unknown {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const key = keys.find((k) => k.trim().toLowerCase() === candidate);
    if (key) return row[key];
  }
  return undefined;
}

// Finds the "Calendar" subfolder inside the SPJIMR root, then falls back to
// searching the root itself — so the transition from old (root) to new
// (subfolder) location is seamless.
async function findCalendarFile(drive: ReturnType<typeof getDriveClient>, rootFolderId: string): Promise<string | null> {
  // Try Calendar subfolder first
  const folderRes = await drive.files.list({
    q: `'${rootFolderId}' in parents and name = '${CALENDAR_FOLDER_NAME}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
  });
  const calendarFolderId = folderRes.data.files?.[0]?.id;

  if (calendarFolderId) {
    const fileRes = await drive.files.list({
      q: `'${calendarFolderId}' in parents and name = '${WEEKLY_SESSIONS_FILENAME}' and trashed = false`,
      fields: "files(id)",
      orderBy: "modifiedTime desc",
      pageSize: 1,
    });
    const file = fileRes.data.files?.[0];
    if (file?.id) return file.id;
  }

  // Fall back to root folder (old location)
  const rootRes = await drive.files.list({
    q: `'${rootFolderId}' in parents and name = '${WEEKLY_SESSIONS_FILENAME}' and trashed = false`,
    fields: "files(id)",
    orderBy: "modifiedTime desc",
    pageSize: 1,
  });
  if (rootRes.data.files?.[0]?.id) return rootRes.data.files[0].id;

  // Final fallback: broad search across all Drive files accessible to the
  // service account — catches the case where the file was saved in a sibling
  // folder (e.g. SPJIMR/Calendar/ when root is SPJIMR/Academics/).
  const broadRes = await drive.files.list({
    q: `name = '${WEEKLY_SESSIONS_FILENAME}' and trashed = false`,
    fields: "files(id, modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: 1,
  });
  return broadRes.data.files?.[0]?.id ?? null;
}

export async function fetchWeeklySessionRows(): Promise<RawCalendarRow[] | null> {
  const rootFolderId = process.env.DRIVE_SUBJECTS_ROOT_FOLDER_ID;
  if (!rootFolderId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return null;

  try {
    const drive = getDriveClient();
    const fileId = await findCalendarFile(drive, rootFolderId);
    if (!fileId) return null;

    const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
    const workbook = XLSX.read(res.data as ArrayBuffer, { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, dateNF: "yyyy-mm-dd" });

    return rows
      .map((row) => {
        const date = findColumn(row, ["date"]);
        const title = findColumn(row, ["event title", "title", "event"]);
        const time = findColumn(row, ["time"]);
        if (typeof date !== "string" || typeof title !== "string" || !date.trim() || !title.trim()) return null;
        return { date: date.trim(), title: title.trim(), time: typeof time === "string" && time.trim() ? time.trim() : null };
      })
      .filter((r): r is RawCalendarRow => r !== null);
  } catch {
    return null;
  }
}
