import * as XLSX from "xlsx";
import { getDriveClient } from "./client";

const WEEKLY_SESSIONS_FILENAME = "weekly-sessions.xlsx";

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

// Reads the weekly-sessions.xlsx file a claude.ai scheduled task drops into
// the Drive "SPJIMR" root folder. Two columns expected: Date and Event
// Title (the raw calendar event summary, unmodified) — parsing/matching of
// that raw title to a subject + session folder happens downstream in
// session-matcher.ts.
export async function fetchWeeklySessionRows(): Promise<RawCalendarRow[] | null> {
  const rootFolderId = process.env.DRIVE_SUBJECTS_ROOT_FOLDER_ID;
  if (!rootFolderId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return null;

  try {
    const drive = getDriveClient();
    const list = await drive.files.list({
      q: `'${rootFolderId}' in parents and name = '${WEEKLY_SESSIONS_FILENAME}' and trashed = false`,
      fields: "files(id, name)",
      pageSize: 1,
    });
    const file = list.data.files?.[0];
    if (!file?.id) return null;

    const res = await drive.files.get({ fileId: file.id, alt: "media" }, { responseType: "arraybuffer" });
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
