import type { createClient } from "@/lib/supabase/server";
import {
  MAGAZINE_SECTIONS,
  NEWS_SECTIONS,
  UNSORTED_LABEL,
  type CompanyAnalysis,
  type CompanyAnalysisContent,
  type DriveFileTag,
  type IndustryPrimer,
  type IndustryPrimerContent,
  type IndustryPrimerNote,
  type KnowledgeEntry,
  type MagazineArticle,
  type MagazineCategoryGroup,
  type MagazineSection,
  type NewsArticle,
  type NewsCategoryGroup,
  type NewsSection,
  type SubjectProfile,
  type UpcomingSession,
  type UpcomingSessionFile,
} from "./types";

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

export async function fetchRecentEntries(supabase: SupabaseServerClient, limit: number): Promise<KnowledgeEntry[]> {
  const { data, error } = await supabase
    .from("knowledge_entries")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
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

// Subjects come from synced notes, but a course folder in Drive should show
// up the moment it exists — even before any notes have been synced from it.
// Drive-only entries get zeroed counts and a null date, sorted alphabetically
// after the subjects that already have notes.
export function withDriveOnlySubjects(subjects: SubjectSummary[], driveNames: string[] | null): SubjectSummary[] {
  if (!driveNames || driveNames.length === 0) return subjects;

  const known = new Set(subjects.map((s) => s.subject));
  const driveOnly: SubjectSummary[] = driveNames
    .filter((name) => !known.has(name))
    .map((name) => ({ subject: name, sessionCount: 0, entryCount: 0, latestDate: null }));

  if (driveOnly.length === 0) return subjects;

  return [...subjects, ...driveOnly].sort((a, b) => {
    if (a.latestDate && b.latestDate) return b.latestDate.localeCompare(a.latestDate);
    if (a.latestDate) return -1;
    if (b.latestDate) return 1;
    return a.subject.localeCompare(b.subject);
  });
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

export async function fetchDriveFileTagsForSubject(
  supabase: SupabaseServerClient,
  subject: string
): Promise<DriveFileTag[]> {
  const { data, error } = await supabase.from("drive_file_tags").select("*").eq("subject", subject);
  // Treat any DB error as "no tags yet" — table may not exist (42P01) or migration
  // may not have run yet. Never crash the subject page over missing tag data.
  if (error) return [];
  return (data ?? []) as DriveFileTag[];
}

export async function searchDriveFiles(
  supabase: SupabaseServerClient,
  query: string
): Promise<DriveFileTag[]> {
  const q = query.trim();
  if (!q) return [];

  // Run both searches in parallel: exact tag containment and partial filename match
  const [byTag, byName] = await Promise.all([
    supabase.from("drive_file_tags").select("*").contains("tags", [q.toLowerCase()]).order("subject"),
    supabase.from("drive_file_tags").select("*").ilike("file_name", `%${q}%`).order("subject"),
  ]);

  if (byTag.error || byName.error) return [];

  // Merge, deduplicate, keeping tag matches first
  const seen = new Set<string>();
  const merged: DriveFileTag[] = [];
  for (const row of [...(byTag.data ?? []), ...(byName.data ?? [])]) {
    if (!seen.has(row.file_id)) {
      seen.add(row.file_id);
      merged.push(row as DriveFileTag);
    }
  }
  return merged;
}

interface MagazineArticleRow {
  id: string;
  title: string;
  section: string;
  order_index: number;
  is_read: boolean;
  magazine_issues: {
    source: string;
    file_name: string;
    web_view_link: string;
    drive_modified_time: string | null;
  } | null;
}

export async function fetchMagazineArticlesByCategory(supabase: SupabaseServerClient): Promise<MagazineCategoryGroup[]> {
  const { data, error } = await supabase
    .from("magazine_articles")
    .select("id, title, section, order_index, is_read, magazine_issues(source, file_name, web_view_link, drive_modified_time)");

  // Treat any DB error as "no data yet" — the tables may not exist until
  // migration 0009 has run, or the scanner hasn't populated them yet.
  if (error) return [];

  const bySection = new Map<MagazineSection, { article: MagazineArticle; modifiedTime: string; orderIndex: number }[]>();

  for (const row of (data ?? []) as unknown as MagazineArticleRow[]) {
    const issue = row.magazine_issues;
    if (!issue) continue;

    const section: MagazineSection = (MAGAZINE_SECTIONS as readonly string[]).includes(row.section)
      ? (row.section as MagazineSection)
      : "Other";

    const entries = bySection.get(section) ?? [];
    entries.push({
      article: {
        id: row.id,
        title: row.title,
        section,
        isRead: row.is_read,
        webViewLink: issue.web_view_link,
        issueLabel: `${issue.source} — ${issue.file_name.replace(/\.pdf$/i, "")}`,
        source: issue.source,
      },
      modifiedTime: issue.drive_modified_time ?? "",
      orderIndex: row.order_index,
    });
    bySection.set(section, entries);
  }

  return MAGAZINE_SECTIONS.map((section) => {
    const entries = bySection.get(section) ?? [];
    entries.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime) || a.orderIndex - b.orderIndex);
    return { section, articles: entries.map((e) => e.article) };
  }).filter((group) => group.articles.length > 0);
}

export interface GmailConnectionStatus {
  connected: boolean;
  email: string | null;
  lastScannedAt: string | null;
}

export async function fetchGmailConnectionStatus(supabase: SupabaseServerClient): Promise<GmailConnectionStatus> {
  const { data, error } = await supabase.from("gmail_connection_status").select("*").maybeSingle();
  if (error || !data) return { connected: false, email: null, lastScannedAt: null };
  return { connected: true, email: data.email ?? null, lastScannedAt: data.last_scanned_at ?? null };
}

export async function searchMagazineArticles(supabase: SupabaseServerClient, query: string): Promise<MagazineArticle[]> {
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from("magazine_articles")
    .select("id, title, section, order_index, is_read, magazine_issues(source, file_name, web_view_link, drive_modified_time)")
    .ilike("title", `%${q}%`)
    .limit(20);

  if (error) return [];

  return (data ?? [])
    .map((row) => row as unknown as MagazineArticleRow)
    .filter((row) => row.magazine_issues)
    .map((row) => {
      const issue = row.magazine_issues!;
      const section: MagazineSection = (MAGAZINE_SECTIONS as readonly string[]).includes(row.section)
        ? (row.section as MagazineSection)
        : "Other";
      return {
        id: row.id,
        title: row.title,
        section,
        isRead: row.is_read,
        webViewLink: issue.web_view_link,
        issueLabel: `${issue.source} — ${issue.file_name.replace(/\.pdf$/i, "")}`,
        source: issue.source,
      };
    });
}

export async function fetchIndustryPrimer(
  supabase: SupabaseServerClient,
  industrySlug: string,
  subsectorSlug: string
): Promise<IndustryPrimer | null> {
  const { data, error } = await supabase
    .from("industry_primers")
    .select("*")
    .eq("industry_slug", industrySlug)
    .eq("subsector_slug", subsectorSlug)
    .maybeSingle();

  if (error) {
    // Postgres "undefined_table" — migration 0010 hasn't run yet. Treat as
    // "no primer yet" so the page falls back to generating one.
    if (error.code === "42P01") return null;
    throw error;
  }
  return data as IndustryPrimer | null;
}

export async function saveIndustryPrimer(
  supabase: SupabaseServerClient,
  industrySlug: string,
  subsectorSlug: string,
  industryName: string,
  subsectorName: string,
  content: IndustryPrimerContent
): Promise<IndustryPrimer> {
  const { data, error } = await supabase
    .from("industry_primers")
    .upsert(
      {
        industry_slug: industrySlug,
        subsector_slug: subsectorSlug,
        industry_name: industryName,
        subsector_name: subsectorName,
        ...content,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "industry_slug,subsector_slug" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as IndustryPrimer;
}

export async function fetchCompanyAnalysis(
  supabase: SupabaseServerClient,
  industrySlug: string,
  subsectorSlug: string,
  companyName: string
): Promise<CompanyAnalysis | null> {
  const { data, error } = await supabase
    .from("company_analyses")
    .select("*")
    .eq("industry_slug", industrySlug)
    .eq("subsector_slug", subsectorSlug)
    .eq("company_name", companyName)
    .maybeSingle();

  if (error) {
    // Postgres "undefined_table" — migration 0017 hasn't run yet. Treat as
    // "no analysis yet" so the page falls back to generating one.
    if (error.code === "42P01") return null;
    throw error;
  }
  return data as CompanyAnalysis | null;
}

export async function saveCompanyAnalysis(
  supabase: SupabaseServerClient,
  industrySlug: string,
  subsectorSlug: string,
  companyName: string,
  content: CompanyAnalysisContent
): Promise<CompanyAnalysis> {
  const { data, error } = await supabase
    .from("company_analyses")
    .upsert(
      {
        industry_slug: industrySlug,
        subsector_slug: subsectorSlug,
        company_name: companyName,
        ...content,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "industry_slug,subsector_slug,company_name" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as CompanyAnalysis;
}

export async function fetchIndustryPrimerNotes(
  supabase: SupabaseServerClient,
  industrySlug: string,
  subsectorSlug: string
): Promise<IndustryPrimerNote[]> {
  const { data, error } = await supabase
    .from("industry_primer_notes")
    .select("*")
    .eq("industry_slug", industrySlug)
    .eq("subsector_slug", subsectorSlug)
    .order("created_at", { ascending: false });

  // Postgres "undefined_table" — migration 0012 hasn't run yet. Treat as "no
  // saved notes" so the Q&A box still renders.
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []) as IndustryPrimerNote[];
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

interface NewsArticleRow {
  id: string;
  title: string;
  link: string;
  source: string;
  summary: string | null;
  published_at: string | null;
  category: string;
  is_read: boolean;
  is_saved: boolean;
  is_bookmarked: boolean;
}

const NEWS_ARTICLE_COLUMNS = "id, title, link, source, summary, published_at, category, is_read, is_saved, is_bookmarked";

function mapNewsArticleRow(row: NewsArticleRow): NewsArticle {
  const section: NewsSection = (NEWS_SECTIONS as readonly string[]).includes(row.category)
    ? (row.category as NewsSection)
    : "Other";
  return {
    id: row.id,
    title: row.title,
    link: row.link,
    source: row.source,
    summary: row.summary ?? "",
    category: section,
    publishedAt: row.published_at,
    isRead: row.is_read,
    isSaved: row.is_saved,
    isBookmarked: row.is_bookmarked,
  };
}

export async function fetchNewsArticlesByCategory(supabase: SupabaseServerClient): Promise<NewsCategoryGroup[]> {
  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_ARTICLE_COLUMNS)
    .order("published_at", { ascending: false });

  if (error) {
    return [];
  }

  const bySection = new Map<NewsSection, NewsArticle[]>();

  for (const row of (data ?? []) as NewsArticleRow[]) {
    const article = mapNewsArticleRow(row);
    const articles = bySection.get(article.category) ?? [];
    articles.push(article);
    bySection.set(article.category, articles);
  }

  return NEWS_SECTIONS.map((section) => ({
    section,
    articles: bySection.get(section) ?? [],
  })).filter((group) => group.articles.length > 0);
}

export async function fetchLatestNewsArticles(supabase: SupabaseServerClient, limit: number): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_ARTICLE_COLUMNS)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map((row) => mapNewsArticleRow(row as NewsArticleRow));
}

export async function fetchNewsArticlesBySection(supabase: SupabaseServerClient, section: NewsSection): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_ARTICLE_COLUMNS)
    .eq("category", section)
    .order("published_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map((row) => mapNewsArticleRow(row as NewsArticleRow));
}

export async function fetchBookmarkedNewsArticles(supabase: SupabaseServerClient): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_ARTICLE_COLUMNS)
    .eq("is_bookmarked", true)
    .order("published_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map((row) => mapNewsArticleRow(row as NewsArticleRow));
}

export async function fetchSavedNewsArticles(supabase: SupabaseServerClient): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_ARTICLE_COLUMNS)
    .eq("is_saved", true)
    .order("published_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map((row) => mapNewsArticleRow(row as NewsArticleRow));
}

interface UpcomingSessionRow {
  event_date: string;
  event_time: string | null;
  event_title: string;
  subject: string | null;
  session_label: string | null;
  sector: string | null;
  files: UpcomingSessionFile[];
}

// Reads whatever the daily calendar-matching cron last stored (today or
// later) — never anything from a past date, which would just be clutter.
export async function fetchUpcomingSessions(supabase: SupabaseServerClient): Promise<UpcomingSession[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("upcoming_sessions")
    .select("event_date, event_time, event_title, subject, session_label, sector, files")
    .gte("event_date", today)
    .order("event_date", { ascending: true });

  if (error) return [];
  return (data ?? []).map((row) => {
    const r = row as UpcomingSessionRow;
    return {
      eventDate: r.event_date,
      eventTime: r.event_time,
      eventTitle: r.event_title,
      subject: r.subject,
      sessionLabel: r.session_label,
      sector: r.sector,
      files: r.files ?? [],
    };
  });
}

export async function fetchPrepStatus(
  supabase: SupabaseServerClient,
  industrySlug: string,
  subsectorSlug: string
): Promise<import("./types").PrepStatus> {
  const { data } = await supabase
    .from("industry_prep")
    .select("status")
    .eq("industry_slug", industrySlug)
    .eq("subsector_slug", subsectorSlug)
    .maybeSingle();
  return ((data as { status?: string } | null)?.status as import("./types").PrepStatus) ?? "not_started";
}

export async function fetchAllPrepStatuses(
  supabase: SupabaseServerClient
): Promise<import("./types").IndustryPrep[]> {
  const { data } = await supabase.from("industry_prep").select("industry_slug, subsector_slug, status, updated_at");
  return (data ?? []) as import("./types").IndustryPrep[];
}

export async function searchNewsArticles(supabase: SupabaseServerClient, query: string): Promise<NewsArticle[]> {
  // Strip PostgREST filter-string delimiters and SQL LIKE wildcards from user input
  const safe = query.replace(/[,()%_]/g, " ").trim();
  if (!safe) return [];

  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_ARTICLE_COLUMNS)
    .or(`title.ilike.%${safe}%,summary.ilike.%${safe}%,source.ilike.%${safe}%`)
    .order("published_at", { ascending: false })
    .limit(60);

  if (error) return [];
  return (data ?? []).map((row) => mapNewsArticleRow(row as NewsArticleRow));
}
