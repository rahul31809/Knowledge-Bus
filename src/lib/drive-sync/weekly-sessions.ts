import * as XLSX from "xlsx";
import { google } from "googleapis";
import { getDriveClient } from "./client";

const WEEKLY_SESSIONS_FILENAME = "weekly-sessions.xlsx";
const CALENDAR_FOLDER_NAME = "Calendar";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export interface RawCalendarRow {
  date: string;
  time: string | null;
  title: string;
}

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

  // 1. root/Calendar/
  const calFolderId = await calendarSubfolder(rootFolderId);
  if (calFolderId) {
    const fileId = await fileInFolder(calFolderId);
    if (fileId) return fileId;
  }

  // 2. root's parent/Calendar/ (sibling search)
  try {
    const rootMeta = await drive.files.get({ fileId: rootFolderId, fields: "parents" });
    const parentId = rootMeta.data.parents?.[0];
    if (parentId) {
      const siblingCalId = await calendarSubfolder(parentId);
      if (siblingCalId) {
        const fileId = await fileInFolder(siblingCalId);
        if (fileId) return fileId;
      }
    }
  } catch { /* continue */ }

  // 3. Broad name search — works as long as the service account is a reader on the file.
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

  const drive = getDriveClient();
  const fileId = await findCalendarFile(drive, rootFolderId);
  if (!fileId) return null;

  // Use native fetch so the ArrayBuffer is untransformed by gaxios internals.
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentialsJson),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const accessToken = await auth.getAccessToken();
  const fetchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!fetchRes.ok) throw new Error(`Drive fetch ${fetchRes.status}: ${await fetchRes.text()}`);

  const arrayBuffer = await fetchRes.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, dateNF: "yyyy-mm-dd" });

  return rows
    .map((row) => {
      const keys = Object.keys(row);
      function col(candidates: string[]): unknown {
        const key = keys.find((k) => candidates.includes(k.trim().toLowerCase()));
        return key ? row[key] : undefined;
      }
      const date = col(["date"]);
      const title = col(["event title", "title", "event"]);
      const time = col(["time"]);
      if (typeof date !== "string" || typeof title !== "string" || !date.trim() || !title.trim()) return null;
      return { date: date.trim(), title: title.trim(), time: typeof time === "string" && time.trim() ? time.trim() : null };
    })
    .filter((r): r is RawCalendarRow => r !== null);
}
