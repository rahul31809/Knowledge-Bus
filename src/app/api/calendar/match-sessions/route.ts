import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { extractPreReadSessionGroups, fetchDriveSubjectNames, fetchSubjectDriveResources, getDriveClient } from "@/lib/drive-sync/client";
import { extractFileContent } from "@/lib/drive-sync/tagger";
import { fetchWeeklySessionRows } from "@/lib/drive-sync/weekly-sessions";
import { extractSectorForSession, matchSectorFolder, matchSessionFolder, matchSubjectName, parseSessionEventTitle } from "@/lib/calendar/session-matcher";

export const maxDuration = 120;

// Exception: this subject's Pre Reads are organized by sector (Energy,
// Fintech, ...), not by session number — the Course Outline has a
// session-to-sector table instead. See extractSectorForSession.
const SECTOR_OUTLINE_SUBJECT = "Sector Strategic Analysis";

// Subjects with no Drive folder yet — display name only, skip subject
// fuzzy-matching and pre-read lookup entirely rather than guessing wrong
// against whatever Drive folder happens to sound closest. Keyed by the
// calendar's subject code, lowercased.
const DISPLAY_ONLY_SUBJECTS: Record<string, string> = {
  mcom: "Management Communication",
};

// Calendar codes whose initials don't obviously expand to the Drive folder
// name — hardcode so Gemini doesn't guess wrong. Keyed by subject code,
// lowercased. Value must match the Drive folder name exactly.
const SUBJECT_CODE_ALIASES: Record<string, string> = {
  bdta: "Business Transformation in the Digital Age",
};

interface MatchResult {
  eventDate: string;
  eventTime: string | null;
  eventTitle: string;
  subject: string | null;
  sessionLabel: string | null;
  sector: string | null;
  files: { id: string; name: string; mimeType: string; webViewLink: string }[];
}

async function processRow(
  row: { date: string; time: string | null; title: string },
  candidateSubjects: string[],
  outlineTextCache: Map<string, string>
): Promise<MatchResult> {
  const base = { eventDate: row.date, eventTime: row.time, eventTitle: row.title };

  try {
    const parsed = parseSessionEventTitle(row.title);
    if (!parsed) return { ...base, subject: null, sessionLabel: null, sector: null, files: [] };

    const displayOnly = DISPLAY_ONLY_SUBJECTS[parsed.subjectCode.trim().toLowerCase()];
    if (displayOnly) return { ...base, subject: displayOnly, sessionLabel: null, sector: null, files: [] };

    const alias = SUBJECT_CODE_ALIASES[parsed.subjectCode.trim().toLowerCase()];
    const subject = alias ?? await matchSubjectName(parsed.subjectCode, candidateSubjects).catch(() => null);
    if (!subject) return { ...base, subject: null, sessionLabel: null, sector: null, files: [] };

    const drive = await fetchSubjectDriveResources(subject);
    const sessionGroups = drive.status === "found" ? extractPreReadSessionGroups(drive.files) : [];

    let matchReference = parsed.sessionRef;
    let sector: string | null = null;

    if (subject === SECTOR_OUTLINE_SUBJECT && drive.status === "found") {
      try {
        let outlineText = outlineTextCache.get(subject);
        if (outlineText === undefined) {
          const outlineFile = drive.files.flatMap((g) => g.files).find((f) => /course outline/i.test(f.name));
          outlineText = outlineFile ? await extractFileContent(getDriveClient(), outlineFile, 12000) : "";
          outlineTextCache.set(subject, outlineText);
        }
        sector = await extractSectorForSession(outlineText, parsed.sessionRef);
        if (sector) matchReference = sector;
      } catch {
        // Outline extraction failing shouldn't block subject/session matching
      }
    }

    const matchedFolder = await (subject === SECTOR_OUTLINE_SUBJECT && sector
      ? matchSectorFolder(sector, sessionGroups.map((g) => g.sessionLabel))
      : matchSessionFolder(matchReference, sessionGroups.map((g) => g.sessionLabel))
    ).catch(() => null);

    let files = sessionGroups.find((g) => g.sessionLabel === matchedFolder)?.files ?? [];

    // Fallback: when a combined session ref (e.g. "Session 7 & 8") has no
    // single Drive folder that covers all sessions, Gemini returns null.
    // Collect files from each individual session number instead.
    if (files.length === 0 && !matchedFolder && sessionGroups.length > 0) {
      const sessionNums = parsed.sessionRef.match(/\d+/g) ?? [];
      const seen = new Set<string>();
      files = [];
      for (const num of sessionNums) {
        const re = new RegExp(`\\b${num}\\b`);
        for (const group of sessionGroups) {
          if (re.test(group.sessionLabel)) {
            for (const f of group.files) {
              if (!seen.has(f.id)) { files.push(f); seen.add(f.id); }
            }
          }
        }
      }
    }

    const sessionLabel = matchedFolder ?? parsed.sessionRef.replace(/^session/i, "Session");

    return { ...base, subject, sessionLabel, sector, files };
  } catch {
    return { ...base, subject: null, sessionLabel: null, sector: null, files: [] };
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Called by cron or curl with the secret — allowed
  } else {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 500 });
  }
  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const rows = await fetchWeeklySessionRows();
  if (rows === null) {
    return NextResponse.json({
      ok: false,
      error: "Couldn't find weekly-sessions.xlsx in the SPJIMR Drive folder — make sure the claude.ai routine has saved it there.",
    });
  }

  const sessionRows = rows.filter((r) => /session/i.test(r.title));

  // Fetch candidate subjects once upfront, then process all sessions in parallel
  const candidateSubjects = (await fetchDriveSubjectNames()) ?? [];
  const outlineTextCache = new Map<string, string>();

  const results = await Promise.all(
    sessionRows.map((row) => processRow(row, candidateSubjects, outlineTextCache))
  );

  // The Excel represents the full current week each time it's regenerated —
  // a full replace keeps the table from accumulating stale rows from
  // sessions that got rescheduled or removed.
  await supabase.from("upcoming_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (results.length > 0) {
    const { error } = await supabase.from("upcoming_sessions").insert(
      results.map((r) => ({
        event_date: r.eventDate,
        event_time: r.eventTime,
        event_title: r.eventTitle,
        subject: r.subject,
        session_label: r.sessionLabel,
        sector: r.sector,
        files: r.files,
      }))
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, matched: results });
}
