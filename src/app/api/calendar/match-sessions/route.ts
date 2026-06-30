import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { extractPreReadSessionGroups, fetchDriveSubjectNames, fetchSubjectDriveResources } from "@/lib/drive-sync/client";
import { fetchWeeklySessionRows } from "@/lib/drive-sync/weekly-sessions";
import { matchSessionFolder, matchSubjectName, parseSessionEventTitle } from "@/lib/calendar/session-matcher";

export const maxDuration = 120;

interface MatchResult {
  eventDate: string;
  eventTitle: string;
  subject: string | null;
  sessionLabel: string | null;
  files: { id: string; name: string; mimeType: string; webViewLink: string }[];
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

  const results: MatchResult[] = [];
  let candidateSubjects: string[] | null = null;

  for (const row of sessionRows) {
    const parsed = parseSessionEventTitle(row.title);
    if (!parsed) {
      results.push({ eventDate: row.date, eventTitle: row.title, subject: null, sessionLabel: null, files: [] });
      continue;
    }

    candidateSubjects ??= (await fetchDriveSubjectNames()) ?? [];
    const subject = await matchSubjectName(parsed.subjectCode, candidateSubjects);
    if (!subject) {
      results.push({ eventDate: row.date, eventTitle: row.title, subject: null, sessionLabel: null, files: [] });
      continue;
    }

    const drive = await fetchSubjectDriveResources(subject);
    const sessionGroups = drive.status === "found" ? extractPreReadSessionGroups(drive.files) : [];
    const sessionLabel = await matchSessionFolder(parsed.sessionRef, sessionGroups.map((g) => g.sessionLabel));
    const files = sessionGroups.find((g) => g.sessionLabel === sessionLabel)?.files ?? [];

    results.push({ eventDate: row.date, eventTitle: row.title, subject, sessionLabel, files });
  }

  // The Excel represents the full current week each time it's regenerated —
  // a full replace keeps the table from accumulating stale rows from
  // sessions that got rescheduled or removed.
  await supabase.from("upcoming_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (results.length > 0) {
    const { error } = await supabase.from("upcoming_sessions").insert(
      results.map((r) => ({
        event_date: r.eventDate,
        event_title: r.eventTitle,
        subject: r.subject,
        session_label: r.sessionLabel,
        files: r.files,
      }))
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, matched: results });
}
