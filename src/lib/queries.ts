import type { createClient } from "@/lib/supabase/server";
import { UNSORTED_LABEL, type KnowledgeEntry, type SubjectProfile } from "./types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface EntryFilters {
  query?: string;
  entryType?: string;
  excludeType?: string;
  tag?: string;
}

export async function fetchEntries(supabase: SupabaseServerClient, filters: EntryFilters = {}): Promise<KnowledgeEntry[]> {
  let request = supabase.from("knowledge_entries").select("*").order("entry_date", { ascending: false });

  const trimmedQuery = filters.query?.trim();
  if (trimmedQuery) {
    request = request.textSearch("search_vector", trimmedQuery, { type: "websearch", config: "english" });
  }
  if (filters.entryType) {
    request = request.eq("entry_type", filters.entryType);
  }
  if (filters.excludeType) {
    request = request.neq("entry_type", filters.excludeType);
  }
  if (filters.tag) {
    request = request.contains("subject_tags", [filters.tag]);
  }

  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as KnowledgeEntry[];
}

export async function fetchEntryById(supabase: SupabaseServerClient, id: string): Promise<KnowledgeEntry | null> {
  const { data, error } = await supabase.from("knowledge_entries").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as KnowledgeEntry | null;
}

export interface SubjectSummary {
  subject: string;
  sessionCount: number;
  entryCount: number;
  // null for subjects that exist only as a Drive folder with no synced notes yet
  latestDate: string | null;
}

export interface SessionSummary {
  session_label: string;
  entryCount: number;
  latestDate: string;
}

interface StudyNotesRow {
  subject: string | null;
  session_label: string | null;
  entry_date: string;
}

async function fetchStudyNotesRows(supabase: SupabaseServerClient): Promise<StudyNotesRow[]> {
  const { data, error } = await supabase
    .from("knowledge_entries")
    .select("subject, session_label, entry_date")
    .eq("entry_type", "study_notes");
  if (error) throw error;
  return (data ?? []) as StudyNotesRow[];
}

export async function fetchSubjects(supabase: SupabaseServerClient): Promise<SubjectSummary[]> {
  const rows = await fetchStudyNotesRows(supabase);

  const bySubject = new Map<string, { sessions: Set<string>; entryCount: number; latestDate: string }>();
  for (const row of rows) {
    const subject = row.subject ?? UNSORTED_LABEL;
    const session = row.session_label ?? UNSORTED_LABEL;
    const acc = bySubject.get(subject) ?? { sessions: new Set<string>(), entryCount: 0, latestDate: row.entry_date };
    acc.sessions.add(session);
    acc.entryCount += 1;
    if (row.entry_date > acc.latestDate) acc.latestDate = row.entry_date;
    bySubject.set(subject, acc);
  }

  return Array.from(bySubject.entries())
    .map(([subject, acc]) => ({
      subject,
      sessionCount: acc.sessions.size,
      entryCount: acc.entryCount,
      latestDate: acc.latestDate,
    }))
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}

export async function fetchSessions(supabase: SupabaseServerClient, subject: string): Promise<SessionSummary[]> {
  const rows = await fetchStudyNotesRows(supabase);

  const bySession = new Map<string, { entryCount: number; latestDate: string }>();
  for (const row of rows) {
    if ((row.subject ?? UNSORTED_LABEL) !== subject) continue;
    const session = row.session_label ?? UNSORTED_LABEL;
    const acc = bySession.get(session) ?? { entryCount: 0, latestDate: row.entry_date };
    acc.entryCount += 1;
    if (row.entry_date > acc.latestDate) acc.latestDate = row.entry_date;
    bySession.set(session, acc);
  }

  return Array.from(bySession.entries())
    .map(([session_label, acc]) => ({ session_label, entryCount: acc.entryCount, latestDate: acc.latestDate }))
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}

export async function fetchSubjectProfile(
  supabase: SupabaseServerClient,
  subject: string
): Promise<SubjectProfile | null> {
  if (subject === UNSORTED_LABEL) return null;

  const { data, error } = await supabase
    .from("subject_profiles")
    .select("*")
    .eq("subject", subject)
    .maybeSingle();

  if (error) {
    // Postgres "undefined_table" — migration 0005 hasn't run yet. Treat as "no
    // profile" rather than crashing the page; the section just won't render.
    if (error.code === "42P01") return null;
    throw error;
  }
  return data as SubjectProfile | null;
}

export async function fetchEntriesBySession(
  supabase: SupabaseServerClient,
  subject: string,
  sessionLabel: string
): Promise<KnowledgeEntry[]> {
  let request = supabase
    .from("knowledge_entries")
    .select("*")
    .eq("entry_type", "study_notes")
    .order("entry_date", { ascending: false });

  request = subject === UNSORTED_LABEL ? request.is("subject", null) : request.eq("subject", subject);
  request = sessionLabel === UNSORTED_LABEL ? request.is("session_label", null) : request.eq("session_label", sessionLabel);

  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as KnowledgeEntry[];
}
