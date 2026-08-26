import { GoogleGenAI } from "@google/genai";

export interface ParsedSessionEvent {
  rawTitle: string;
  subjectCode: string;
  sessionRef: string;
}

// Handles two calendar title formats:
//
// Format 1 — "Subject - DIV X - Session N" (old timetable style):
//   "ET - DIV C - Session 5 & 6", "MCOM_DIV C_Session 29 & 30"
//
// Format 2 — "PGPM-SUBCODE-N&M" (Functional Depth style):
//   "PGPM-PSS-2&3", "PGPM/Batch22-OS-1&2", "PGPM/B22-SOM-1",
//   "PGPM: SCPM Session 1&2" (hybrid — still caught by Format 1)
//
// In both cases the returned subjectCode may contain surrounding noise
// (e.g. "PGPM: SCPM") — the route resolves it via alias substring search
// before falling back to Gemini.
export function parseSessionEventTitle(title: string): ParsedSessionEvent | null {
  const normalized = title.replace(/_/g, " ");

  // Format 1: explicit "Session N" keyword
  const sessionMatch = normalized.match(/session\s*[-–]?\s*(?:no\.?\s*)?\d+(?:\s*[,&]\s*\d+)*/i);
  if (sessionMatch) {
    const sessionRef = sessionMatch[0];
    const withoutSession = normalized.slice(0, sessionMatch.index) + normalized.slice(sessionMatch.index! + sessionRef.length);
    const withoutDiv = withoutSession.replace(/\bdiv\b[\s-]*\w*/gi, " ");
    const subjectCode = withoutDiv.replace(/^[\s\-:]+|[\s\-:]+$/g, "").trim().replace(/\s*&\s*/g, " and ");
    if (!subjectCode) return null;
    return { rawTitle: title, subjectCode, sessionRef };
  }

  // Format 2: session numbers appear at the end after a separator,
  // e.g. "PGPM-PSS-2&3" → subjectCode="PSS", sessionRef="Session 2 & 3"
  const trailingNums = normalized.match(/[-:/\s]+(\d+(?:\s*&\s*\d+)*)\s*$/);
  if (trailingNums) {
    const sessionNums = trailingNums[1].replace(/\s*&\s*/g, " & ");
    const beforeNums = normalized.slice(0, trailingNums.index);
    const segments = beforeNums.split(/[-/:,\s]+/).filter((s) => s.trim().length > 0);
    // Take the last segment that is not a known prefix or pure-number noise
    const subjectCode = [...segments].reverse().find(
      (s) => !/^(pgpm|batch\d*|b\d{2}|prof)$/i.test(s) && !/^\d+$/.test(s)
    );
    if (!subjectCode) return null;
    return { rawTitle: title, subjectCode, sessionRef: `Session ${sessionNums}` };
  }

  return null;
}

function getAi(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
}

async function pickBestMatch(question: string, options: string[]): Promise<string | null> {
  if (options.length === 0) return null;

  const ai = getAi();
  const prompt = `${question}

Candidates (choose exactly one, verbatim, from this list):
${options.map((o) => `- ${o}`).join("\n")}

Output ONLY the exact matching candidate string with no extra text, or output exactly NONE if nothing in the list plausibly matches.`;

  const result = await ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents: prompt });
  const text = result.text?.trim() ?? "";
  if (!text || text === "NONE") return null;
  return options.find((o) => o.trim() === text) ?? null;
}

// A calendar entry like "ET" is an institution-specific abbreviation with no
// derivable mapping to a Drive subject folder name — Gemini resolves it
// against the actual list of subjects rather than a hardcoded lookup table,
// so new subjects need no code changes here.
export async function matchSubjectName(subjectCode: string, candidateSubjects: string[]): Promise<string | null> {
  return pickBestMatch(
    `An MBA timetable lists a class under the code or short name "${subjectCode}". Which of these actual course names is it referring to? Only pick one if it's a confident, specific match (an abbreviation expansion or a clear partial/full name match) — the candidate list may not contain the right course at all, in which case picking the closest-sounding wrong one is worse than admitting no match.`,
    candidateSubjects
  );
}

// Fast local session folder matching — extracts session numbers from both
// the event ref and each candidate folder name, then finds the folder whose
// number or range covers all the event's session numbers. Handles formats
// like "Session 1&2", "Session 4 to 6", "Session 3-4" with no API calls.
export function matchSessionFolderLocal(sessionRef: string, candidateFolders: string[]): string | null {
  const refNums = [...sessionRef.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (refNums.length === 0 || candidateFolders.length === 0) return null;

  for (const folder of candidateFolders) {
    const folderNums = [...folder.matchAll(/\d+/g)].map((m) => Number(m[0]));
    if (folderNums.length === 0) continue;
    const start = Math.min(...folderNums);
    const end = Math.max(...folderNums);
    if (refNums.every((n) => n >= start && n <= end)) return folder;
  }
  return null;
}

// Gemini fallback for edge cases the local matcher can't handle (e.g. topic-
// named folders with no session numbers). Prefer matchSessionFolderLocal.
export async function matchSessionFolder(sessionRef: string, candidateFolders: string[]): Promise<string | null> {
  return pickBestMatch(
    `A class is scheduled as "${sessionRef}". Which of these Drive folder names (each covering one or more session numbers) covers that session?`,
    candidateFolders
  );
}

// Sector Strategic Analysis organises Pre Reads by sector name, not session
// number. The sector name extracted from the course outline (e.g. "Software
// Products / Services") may differ in punctuation from the Drive folder name
// (e.g. "Software Products and Services") — use a semantic prompt so Gemini
// can bridge that gap rather than doing a string-equality check.
export async function matchSectorFolder(sectorName: string, candidateFolders: string[]): Promise<string | null> {
  return pickBestMatch(
    `The sector being studied is "${sectorName}". Which of these Drive folder names refers to the same sector? Treat "/" and "and" as equivalent (e.g. "Software Products / Services" matches "Software Products and Services").`,
    candidateFolders
  );
}

// Exception for subjects whose Course Outline lists a session-to-sector
// table (Pre Reads is organized by sector, not session number) — e.g.
// "Sector Strategic Analysis", where session 23-24 maps to "Software
// Products / Services". Extracts the sector name from the outline text for
// a given session reference, rather than from the Drive folder names.
export async function extractSectorForSession(courseOutlineText: string, sessionRef: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || !courseOutlineText.trim()) return null;

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `This is a course outline document that includes a session-by-session schedule table mapping session numbers (often ranges like "3-4" or "23-24") to the sector/industry covered that session.

Course outline:
${courseOutlineText.trim()}

The class in question is scheduled as "${sessionRef}". Find the row in the session schedule table whose session number/range includes this session, and output ONLY the sector name from that row (e.g. "Energy", "Fintech", "Automotive") — no extra words, no "Sector -" prefix, no guest/company names. If no matching row exists, output exactly NONE.`;

  const result = await ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents: prompt });
  const text = result.text?.trim() ?? "";
  if (!text || text === "NONE") return null;
  return text;
}
