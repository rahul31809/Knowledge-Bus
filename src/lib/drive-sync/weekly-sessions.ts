import ExcelJS from "exceljs";
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

  // Use native fetch for binary download — googleapis stream/arraybuffer modes
  // produce data that SheetJS misreads; native fetch gives a clean ArrayBuffer.
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
  const buffer = Buffer.from(new Uint8Array(arrayBuffer));

  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  // Read header row to find column indices
  const headerRow = sheet.getRow(1);
  let dateCol = -1, timeCol = -1, titleCol = -1;
  headerRow.eachCell((cell, colNumber) => {
    const h = String(cell.value ?? "").trim().toLowerCase();
    if (h === "date") dateCol = colNumber;
    else if (h === "time") timeCol = colNumber;
    else if (h === "event title" || h === "title" || h === "event") titleCol = colNumber;
  });
  if (dateCol === -1 || titleCol === -1) return [];

  const rows: RawCalendarRow[] = [];
  sheet.eachRow((row, rowIndex) => {
    if (rowIndex === 1) return; // skip header
    const rawDate = row.getCell(dateCol).value;
    const rawTitle = row.getCell(titleCol).value;
    const rawTime = timeCol !== -1 ? row.getCell(timeCol).value : null;

    let date = "";
    if (rawDate instanceof Date) {
      date = rawDate.toISOString().slice(0, 10);
    } else if (rawDate !== null && rawDate !== undefined) {
      date = String(rawDate).trim();
    }

    const title = rawTitle !== null && rawTitle !== undefined ? String(rawTitle).trim() : "";
    const time = rawTime !== null && rawTime !== undefined ? String(rawTime).trim() : null;

    if (date && title) {
      rows.push({ date, title, time: time || null });
    }
  });

  return rows;
}
