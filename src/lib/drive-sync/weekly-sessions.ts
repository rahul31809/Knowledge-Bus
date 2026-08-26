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

// Searches for weekly-sessions.xlsx in all likely locations:
// 1. SPJIMR/Calendar/ — the canonical location (routine saves here)
// 2. Academics/Calendar/ — legacy location from a prior fix
// 3. Broad Drive-wide search — last resort
//
// rootFolderId = Academics folder. We navigate up to its parent (SPJIMR) to
// find the Calendar sibling, since the routine writes to SPJIMR/Calendar/.
async function findCalendarFile(drive: ReturnType<typeof getDriveClient>, rootFolderId: string): Promise<string | null> {
  async function fileInFolder(folderId: string): Promise<string | null> {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and name = '${WEEKLY_SESSIONS_FILENAME}' and trashed = false`,
      fields: "files(id)",
      orderBy: "modifiedTime desc",
      pageSize: 1,
    });
    return res.data.files?.[0]?.id ?? null;
  }

  async function calendarSubfolder(parentId: string): Promise<string | null> {
    const res = await drive.files.list({
      q: `'${parentId}' in parents and name = '${CALENDAR_FOLDER_NAME}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
      fields: "files(id)",
      pageSize: 1,
    });
    return res.data.files?.[0]?.id ?? null;
  }

  // 1. SPJIMR/Calendar/ — navigate up from Academics to its parent (SPJIMR)
  try {
    const rootMeta = await drive.files.get({ fileId: rootFolderId, fields: "parents" });
    const spjimrId = rootMeta.data.parents?.[0];
    if (spjimrId) {
      const calFolderId = await calendarSubfolder(spjimrId);
      if (calFolderId) {
        const fileId = await fileInFolder(calFolderId);
        if (fileId) return fileId;
      }
    }
  } catch {
    // parent lookup failed — continue to fallbacks
  }

  // 2. Academics/Calendar/ — legacy location
  const legacyFolderId = await calendarSubfolder(rootFolderId);
  if (legacyFolderId) {
    const fileId = await fileInFolder(legacyFolderId);
    if (fileId) return fileId;
  }

  // 3. Broad search across all Drive files the service account can access
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
