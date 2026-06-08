import { google, drive_v3 } from "googleapis";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const DOC_MIME = "application/vnd.google-apps.document";

export function getDriveClient(): drive_v3.Drive {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credentialsJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentialsJson),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}

export interface DriveFolder {
  id: string;
  name: string;
}

export async function listSubfolders(drive: drive_v3.Drive, parentId: string): Promise<DriveFolder[]> {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 100,
  });

  return (res.data.files ?? [])
    .filter((f): f is drive_v3.Schema$File & { id: string; name: string } => Boolean(f.id && f.name))
    .map((f) => ({ id: f.id, name: f.name }));
}

export interface DriveDoc {
  id: string;
  name: string;
  modifiedTime: string;
}

// Convention: the rolling notes doc is a Google Doc named "<Subject> — Master
// Notes (...)". Folders may briefly hold more than one (old dated copies the
// user hasn't cleaned up yet) — the most recently modified one wins.
export async function findMasterNotesDoc(drive: drive_v3.Drive, folderId: string): Promise<DriveDoc | null> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType = '${DOC_MIME}' and name contains 'Master Notes' and trashed = false`,
    fields: "files(id, name, modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: 1,
  });

  const file = res.data.files?.[0];
  if (!file?.id || !file.name || !file.modifiedTime) return null;
  return { id: file.id, name: file.name, modifiedTime: file.modifiedTime };
}

export async function exportDocAsText(drive: drive_v3.Drive, fileId: string): Promise<string> {
  const res = await drive.files.export({ fileId, mimeType: "text/plain" }, { responseType: "text" });
  return String(res.data);
}
