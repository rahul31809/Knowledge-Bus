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
  "Functional Depth",
]);

// Display order for the "MBA Study Materials" term cards — program
// progression order, not the order folders happen to appear in Drive.
const CATEGORY_ORDER = [
  "PGPM Pre Foundation",
  "PGPM Core Foundation",
  "PGPM Foundation",
  "PGPM Leadership, Innovation & Change",
  "Functional Depth",
];

// Returns the list of subfolders to scan for category/subject folders.
// If the root's direct children don't include any category folder (e.g. the
// env var points to a SPJIMR root that contains an "Academics" intermediary),
// navigate into "Academics" first so category folders like "Functional Depth"
// are reachable regardless of how deep the root is configured.
async function resolveSubfolders(drive: drive_v3.Drive, rootFolderId: string): Promise<DriveChild[]> {
  const rootChildren = await listFolderChildren(drive, rootFolderId);
  const rootSubfolders = rootChildren.filter((c) => c.mimeType === FOLDER_MIME);
  const hasCategoryDirect = rootSubfolders.some((f) => CATEGORY_FOLDER_NAMES.has(f.name));
  if (hasCategoryDirect) return rootSubfolders;
  const academics = rootSubfolders.find((f) => f.name === "Academics");
  if (!academics) return rootSubfolders;
  const academicsChildren = await listFolderChildren(drive, academics.id);
  return academicsChildren.filter((c) => c.mimeType === FOLDER_MIME);
}

export async function listSubjectFolders(drive: drive_v3.Drive, rootFolderId: string): Promise<DriveFolder[]> {
  const subfolders = await resolveSubfolders(drive, rootFolderId);

  const result: DriveFolder[] = [];
  for (const folder of subfolders) {
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

export interface DriveCategoryGroup {
  category: string;
  subjects: DriveFolder[];
}

// Groups course folders by their term/category folder — the inverse of
// listSubjectFolders' flattening. Used for the "MBA Study Materials" section,
// which browses subjects term-by-term. Non-category root folders (e.g. "News
// Paper and Magazines") aren't part of MBA Study Materials and are skipped.
export async function listSubjectFoldersByCategory(drive: drive_v3.Drive, rootFolderId: string): Promise<DriveCategoryGroup[]> {
  const subfolders = await resolveSubfolders(drive, rootFolderId);
  const categoryFolders = subfolders.filter((c) => CATEGORY_FOLDER_NAMES.has(c.name));

  const groups = new Map<string, DriveFolder[]>();
  for (const folder of categoryFolders) {
    const children = await listFolderChildren(drive, folder.id);
    const courseFolders = children.filter((c) => c.mimeType === FOLDER_MIME);
    groups.set(folder.name, courseFolders.map((f) => ({ id: f.id, name: f.name })));
  }

  return CATEGORY_ORDER.filter((name) => groups.has(name)).map((name) => ({
    category: name,
    subjects: groups.get(name)!,
  }));
}

// Names of every subject folder in Drive, grouped by term — lets the "MBA
// Study Materials" section drill from terms into their course folders.
// Returns null when Drive isn't configured or unreachable.
export async function fetchDriveSubjectsByCategory(): Promise<DriveCategoryGroup[] | null> {
  const rootFolderId = process.env.DRIVE_SUBJECTS_ROOT_FOLDER_ID;
  if (!rootFolderId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return null;

  try {
    const drive = getDriveClient();
    return await listSubjectFoldersByCategory(drive, rootFolderId);
  } catch {
    return null;
  }
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

export interface PreReadSessionGroup {
  sessionLabel: string;
  files: DriveFileEntry[];
}

// Picks out the "Pre Reads/<session or sector folder>/..." groups from a
// subject's full file listing. The grouping key is whichever folder sits
// directly under "Pre Reads" — not the leaf segment — because some subjects
// nest an extra topic-name level below the session folder (e.g. BTDA's
// "Pre Reads/Session 13&14/Technology Acceptance Model (TAM)-.../files");
// using the leaf would surface the topic name instead of the session,
// making it unmatchable. All files at any depth below that folder are
// aggregated into one group.
export function extractPreReadSessionGroups(groups: DriveFileGroup[]): PreReadSessionGroup[] {
  const bySession = new Map<string, DriveFileEntry[]>();

  for (const g of groups) {
    if (!g.folderName) continue;
    const segments = g.folderName.split("/");
    const preReadsIndex = segments.findIndex((s) => /pre[\s-]?reads/i.test(s));
    if (preReadsIndex === -1 || preReadsIndex + 1 >= segments.length) continue;

    const groupKey = segments[preReadsIndex + 1];
    const existing = bySession.get(groupKey) ?? [];
    existing.push(...g.files);
    bySession.set(groupKey, existing);
  }

  return [...bySession.entries()].map(([sessionLabel, files]) => ({ sessionLabel, files }));
}

const QUIZ_SOURCE_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.google-apps.presentation",
]);

export interface QuizSourceFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  sessionLabel: string | null;
}

// PPTs filenames carry their own session range ("Session 11&12_Budgeting.pptx",
// "Session 1 to 4.pdf") rather than living in per-session subfolders the way
// Pre Reads do — so the label comes from the filename, not the folder tree.
function parsePptSessionLabel(filename: string): string | null {
  const match = filename.match(/session\s*\d+(?:\s*(?:to|&|and|-)\s*\d+)*/i);
  return match ? match[0].replace(/^session/i, "Session") : null;
}

// Finds every file under any "PPTs"-named folder, at any depth, across a
// subject's full file listing.
// Sorts by the first session number found ("Session 14&15" -> 14), so
// "Session 10" lands after "Session 9" rather than between "Session 1" and
// "Session 2" the way a plain alphabetical sort would put it. Files with no
// parseable session number sort last.
function firstSessionNumber(label: string | null): number {
  const match = label?.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

export function extractQuizSourceFiles(groups: DriveFileGroup[]): QuizSourceFile[] {
  return groups
    .filter((g) => g.folderName && g.folderName.split("/").some((s) => /^ppts?$/i.test(s)))
    .flatMap((g) => g.files)
    .filter((f) => QUIZ_SOURCE_MIMES.has(f.mimeType))
    .map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      webViewLink: f.webViewLink,
      sessionLabel: parsePptSessionLabel(f.name),
    }))
    .sort((a, b) => firstSessionNumber(a.sessionLabel) - firstSessionNumber(b.sessionLabel));
}
