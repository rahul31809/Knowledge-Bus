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

export interface DriveFileEntry {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

export interface DriveFileGroup {
  // null = files sitting directly in the subject folder (not inside a subfolder)
  folderName: string | null;
  files: DriveFileEntry[];
}

function isMasterNotesDoc(name: string, mimeType: string): boolean {
  return mimeType === DOC_MIME && name.includes("Master Notes");
}

interface DriveChild {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string | null;
}

async function listFolderChildren(drive: drive_v3.Drive, folderId: string): Promise<DriveChild[]> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink)",
    orderBy: "folder,name",
    pageSize: 200,
  });

  return (res.data.files ?? []).filter((f): f is DriveChild => Boolean(f.id && f.name && f.mimeType));
}

function toFileEntries(children: DriveChild[]): DriveFileEntry[] {
  return children
    .filter((c) => c.mimeType !== FOLDER_MIME && c.webViewLink && !isMasterNotesDoc(c.name, c.mimeType))
    .map((c) => ({ id: c.id, name: c.name, mimeType: c.mimeType, webViewLink: c.webViewLink as string }));
}

// Mirrors the user's own Drive folder structure: files directly in the subject
// folder, plus one level of subfolders (e.g. "Pre-Reads", "PPTs", "Cases") —
// each rendered as its own group. Master Notes docs are excluded since those
// already surface as synced session notes.
export async function listSubjectFiles(drive: drive_v3.Drive, subjectFolderId: string): Promise<DriveFileGroup[]> {
  const children = await listFolderChildren(drive, subjectFolderId);
  const groups: DriveFileGroup[] = [];

  const topLevelFiles = toFileEntries(children);
  if (topLevelFiles.length > 0) groups.push({ folderName: null, files: topLevelFiles });

  const subfolders = children.filter((c) => c.mimeType === FOLDER_MIME);
  for (const folder of subfolders) {
    const folderChildren = await listFolderChildren(drive, folder.id);
    const files = toFileEntries(folderChildren);
    if (files.length > 0) groups.push({ folderName: folder.name, files });
  }

  return groups;
}

export type SubjectDriveLookup =
  | { status: "unavailable" }
  | { status: "not_found" }
  | { status: "found"; files: DriveFileGroup[] };

// Looks up a subject's Drive folder and lists its files in one round trip.
// "unavailable" covers missing config or API errors — degrade silently.
// "not_found" means Drive is reachable but no folder matches this subject,
// which callers use to distinguish "this subject doesn't exist anywhere"
// from "it exists in Drive but we couldn't reach Drive right now".
export async function fetchSubjectDriveResources(subject: string): Promise<SubjectDriveLookup> {
  const rootFolderId = process.env.DRIVE_SUBJECTS_ROOT_FOLDER_ID;
  if (!rootFolderId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return { status: "unavailable" };

  try {
    const drive = getDriveClient();
    const subfolders = await listSubfolders(drive, rootFolderId);
    const folder = subfolders.find((f) => f.name === subject);
    if (!folder) return { status: "not_found" };

    const files = await listSubjectFiles(drive, folder.id);
    return { status: "found", files };
  } catch {
    return { status: "unavailable" };
  }
}

// Names of every subject folder in Drive — lets the subjects list surface
// courses that only exist as a Drive folder, with no synced notes yet.
// Returns null when Drive isn't configured or unreachable.
export async function fetchDriveSubjectNames(): Promise<string[] | null> {
  const rootFolderId = process.env.DRIVE_SUBJECTS_ROOT_FOLDER_ID;
  if (!rootFolderId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return null;

  try {
    const drive = getDriveClient();
    const subfolders = await listSubfolders(drive, rootFolderId);
    return subfolders.map((f) => f.name);
  } catch {
    return null;
  }
}
