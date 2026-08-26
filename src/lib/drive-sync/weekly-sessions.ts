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

// Searches for weekly-sessions.xlsx using three strategies, each wrapped in
// its own try/catch so a failure in one always falls through to the next.
// The broad name search (step 3) is the reliable final fallback — the service
// account is an explicit reader on the file even when folder-level listing
// is unavailable.
async function findCalendarFile(drive: ReturnType<typeof getDriveClient>, rootFolderId: string): Promise<string | null> {
  async function fileInFolder(folderId: string): Promise<string | null> {
    try {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and name = '${WEEKLY_SESSIONS_FILENAME}' and trashed = false`,
        fields: "files(id)",
        orderBy: "modifiedTime desc",
        pageSize: 1,
      });
      return res.data.files?.[0]?.id ?? null;
    } catch { return null; }
  }

  async function calendarSubfolder(parentId: string): Promise<string | null> {
    try {
      const res = await drive.files.list({
        q: `'${parentId}' in parents and name = '${CALENDAR_FOLDER_NAME}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
        fields: "files(id)",
        pageSize: 1,
      });
      return res.data.files?.[0]?.id ?? null;
    } catch { return null; }
  }

  // 1. Academics/Calendar/ — primary location (routine saves here)
  const calFolderId = await calendarSubfolder(rootFolderId);
  if (calFolderId) {
    const fileId = await fileInFolder(calFolderId);
    if (fileId) return fileId;
  }

  // 2. SPJIMR/Calendar/ — sibling of Academics (old routine location)
  try {
    const rootMeta = await drive.files.get({ fileId: rootFolderId, fields: "parents" });
    const spjimrId = rootMeta.data.parents?.[0];
    if (spjimrId) {
      const siblingCalId = await calendarSubfolder(spjimrId);
      if (siblingCalId) {
        const fileId = await fileInFolder(siblingCalId);
        if (fileId) return fileId;
      }
    }
  } catch { /* continue */ }

  // 3. Broad name search — works as long as the service account is an explicit
  //    reader on the file, regardless of folder-level access.
  try {
    const broadRes = await drive.files.list({
      q: `name = '${WEEKLY_SESSIONS_FILENAME}' and trashed = false`,
      fields: "files(id, modifiedTime)",
      orderBy: "modifiedTime desc",
      pageSize: 1,
    });
    return broadRes.data.files?.[0]?.id ?? null;
  } catch { return null; }
}

export async function fetchWeeklySessionRows(): Promise<RawCalendarRow[] | null> {
  const rootFolderId = process.env.DRIVE_SUBJECTS_ROOT_FOLDER_ID;
  if (!rootFolderId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return null;

  try {
    const drive = getDriveClient();
    const fileId = await findCalendarFile(drive, rootFolderId);
    if (!fileId) return null;

    const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = res.data as any;
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", resolve);
      stream.on("error", reject);
    });
    const fileBuffer = Buffer.concat(chunks);
    const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
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
