import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { getStoredGmailToken, listUpcomingEvents } from "@/lib/gmail/client";
import { extractPreReadSessionGroups, fetchDriveSubjectNames, fetchSubjectDriveResources } from "@/lib/drive-sync/client";
import { matchSessionFolder, matchSubjectName, parseSessionEventTitle } from "@/lib/calendar/session-matcher";

export const maxDuration = 120;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function dateStringIST(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function tomorrowIST(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return dateStringIST(tomorrow);
}

interface MatchResult {
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

  const token = await getStoredGmailToken(supabase);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Google account is not connected — connect it from the News page." });
  }

  const target = tomorrowIST();

  let events;
  try {
    events = await listUpcomingEvents(token.refresh_token, 2);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({
      ok: false,
      error: `Failed to read calendar — ${reason}. If this is a scope error, reconnect Google from the News page so Calendar access is granted.`,
    });
  }

  const sessionEvents = events.filter((e) => e.start && dateStringIST(new Date(e.start)) === target && /session/i.test(e.title));

  const results: MatchResult[] = [];
  let candidateSubjects: string[] | null = null;

  for (const event of sessionEvents) {
    const parsed = parseSessionEventTitle(event.title);
    if (!parsed) {
      results.push({ eventTitle: event.title, subject: null, sessionLabel: null, files: [] });
      continue;
    }

    candidateSubjects ??= (await fetchDriveSubjectNames()) ?? [];
    const subject = await matchSubjectName(parsed.subjectCode, candidateSubjects);
    if (!subject) {
      results.push({ eventTitle: event.title, subject: null, sessionLabel: null, files: [] });
      continue;
    }

    const drive = await fetchSubjectDriveResources(subject);
    const sessionGroups = drive.status === "found" ? extractPreReadSessionGroups(drive.files) : [];
    const sessionLabel = await matchSessionFolder(parsed.sessionRef, sessionGroups.map((g) => g.sessionLabel));
    const files = sessionGroups.find((g) => g.sessionLabel === sessionLabel)?.files ?? [];

    results.push({ eventTitle: event.title, subject, sessionLabel, files });
  }

  await supabase.from("upcoming_sessions").delete().eq("event_date", target);
  if (results.length > 0) {
    const { error } = await supabase.from("upcoming_sessions").insert(
      results.map((r) => ({
        event_date: target,
        event_title: r.eventTitle,
        subject: r.subject,
        session_label: r.sessionLabel,
        files: r.files,
      }))
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, date: target, matched: results });
}
