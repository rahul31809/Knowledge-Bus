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
  modifiedTime?: string;
}

export interface DriveFileGroup {
  // null = files sitting directly in the subject folder; otherwise the
  // subfolder path relative to the subject folder, e.g. "Pre-Reads" or
  // "Pre-Reads/Week 1" for nested subfolders.
  folderName: string | null;
  files: DriveFileEntry[];
}

interface DriveChild {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string | null;
  modifiedTime?: string | null;
}

async function listFolderChildren(drive: drive_v3.Drive, folderId: string): Promise<DriveChild[]> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink, modifiedTime)",
    orderBy: "folder,name",
    pageSize: 200,
  });

  return (res.data.files ?? []).filter((f): f is DriveChild => Boolean(f.id && f.name && f.mimeType));
}

function toFileEntries(children: DriveChild[]): DriveFileEntry[] {
  return children
    .filter((c) => c.mimeType !== FOLDER_MIME && c.webViewLink)
    .map((c) => ({
      id: c.id,
      name: c.name,
      mimeType: c.mimeType,
      webViewLink: c.webViewLink as string,
      modifiedTime: c.modifiedTime ?? undefined,
    }));
}

// Recursively lists every file under a subject folder, however deeply
// nested. Each group's folderName is the subfolder path relative to the
// subject folder (e.g. "Pre-Reads/Week 1"), or null for files sitting
// directly in the subject folder.
export async function listSubjectFiles(drive: drive_v3.Drive, subjectFolderId: string): Promise<DriveFileGroup[]> {
  return listFilesRecursive(drive, subjectFolderId, null);
}

async function listFilesRecursive(
  drive: drive_v3.Drive,
  folderId: string,
  pathPrefix: string | null
): Promise<DriveFileGroup[]> {
  const children = await listFolderChildren(drive, folderId);
  const groups: DriveFileGroup[] = [];

  const files = toFileEntries(children);
  if (files.length > 0) groups.push({ folderName: pathPrefix, files });

  const subfolders = children.filter((c) => c.mimeType === FOLDER_MIME);
  for (const folder of subfolders) {
    const childPath = pathPrefix ? `${pathPrefix}/${folder.name}` : folder.name;
    groups.push(...(await listFilesRecursive(drive, folder.id, childPath)));
  }

  return groups;
}

// Folders directly under the Subjects root that are pure groupers — each
// of their children is a course folder (a subject), e.g. "PGPM Foundation"
// contains "MCEP", "SOS", "BGIE", etc. Every other folder in the tree —
// root-level or nested one level inside a category — is a subject as soon
// as it's reached, whatever it contains. Course folders hold content
// subfolders (Pre Reads, PPTs, Books, Group Assignment, ...) whose names
// vary per course, so those are never treated as subjects; listSubjectFiles
// picks them up as folder groups instead.
//
// When a new category folder is added (e.g. for a future term), add its
// exact name here.
const CATEGORY_FOLDER_NAMES = new Set([
  "PGPM Foundation",
  "PGPM Core Foundation",
  "PGPM Pre Foundation",
  "PGPM Leadership, Innovation & Change",
]);

export async function listSubjectFolders(drive: drive_v3.Drive, rootFolderId: string): Promise<DriveFolder[]> {
  const rootChildren = await listFolderChildren(drive, rootFolderId);
  const rootSubfolders = rootChildren.filter((c) => c.mimeType === FOLDER_MIME);

  const result: DriveFolder[] = [];
  for (const folder of rootSubfolders) {
    if (CATEGORY_FOLDER_NAMES.has(folder.name)) {
      const children = await listFolderChildren(drive, folder.id);
      const courseFolders = children.filter((c) => c.mimeType === FOLDER_MIME);
      result.push(...courseFolders.map((f) => ({ id: f.id, name: f.name })));
    } else {
      result.push({ id: folder.id, name: folder.name });
    }
  }
  return result;
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
    const subjectFolders = await listSubjectFolders(drive, rootFolderId);
    const folder = subjectFolders.find((f) => f.name === subject);
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
    const subjectFolders = await listSubjectFolders(drive, rootFolderId);
    return subjectFolders.map((f) => f.name);
  } catch {
    return null;
  }
}
