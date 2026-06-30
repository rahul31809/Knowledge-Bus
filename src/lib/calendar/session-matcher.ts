import { GoogleGenAI } from "@google/genai";

export interface ParsedSessionEvent {
  rawTitle: string;
  subjectCode: string;
  sessionRef: string;
}

// Calendar titles roughly follow "<Subject> - DIV <X> - Session <N[& M]>",
// e.g. "ET - DIV C - Session 5 & 6" — but real data shows inconsistent
// delimiters (dashes, underscores, mixed spacing) and an occasional missing
// DIV segment. Extracting the session reference and the DIV segment via
// regex (rather than splitting on a fixed delimiter) is robust to all of
// that; whatever text remains is the subject code/name, fuzzy-matched by
// Gemini downstream anyway so leftover noise there is harmless.
export function parseSessionEventTitle(title: string): ParsedSessionEvent | null {
  // Underscores count as word characters in regex, which silently breaks
  // \b boundaries around "DIV" in titles like "MCOM_DIV C_Session 29 & 30"
  // — normalizing to spaces first keeps boundary matching reliable.
  const normalized = title.replace(/_/g, " ");

  const sessionMatch = normalized.match(/session\s*\d+(?:\s*&\s*\d+)*/i);
  if (!sessionMatch) return null;
  const sessionRef = sessionMatch[0];

  const withoutSession = normalized.slice(0, sessionMatch.index) + normalized.slice(sessionMatch.index! + sessionRef.length);
  const withoutDiv = withoutSession.replace(/\bdiv\b[\s-]*\w*/gi, " ");
  const subjectCode = withoutDiv.replace(/^[\s\-:]+|[\s\-:]+$/g, "").trim();
  if (!subjectCode) return null;

  return { rawTitle: title, subjectCode, sessionRef };
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
    `An MBA timetable lists a class under the code or short name "${subjectCode}". Which of these actual course names is it most likely referring to?`,
    candidateSubjects
  );
}

// Drive folders use inconsistent session-range naming ("Session 1&2",
// "Session 4 to 6") that rarely matches a calendar's session reference
// ("Session 5 & 6") as an exact string — Gemini resolves which folder's
// range actually covers the referenced session number(s).
export async function matchSessionFolder(sessionRef: string, candidateFolders: string[]): Promise<string | null> {
  return pickBestMatch(
    `A class is scheduled as "${sessionRef}". Which of these Drive folder names (each covering one or more session numbers) covers that session?`,
    candidateFolders
  );
}
